import cryptoRandomString from 'crypto-random-string';
import dayjs from 'dayjs';
import orderBy from 'lodash/orderBy.js';
import groupBy from 'lodash/groupBy.js';
import Order from '../../models/order.js';
import { createShipment } from '../../services/logistic.js';
import { sendOTP } from '../../services/sms.js';
import APIError from '../../utils/error.js';
import logger from '../../utils/logger.js';
import notify, { NotificationType } from '../../utils/notification.js';
import {
  getArrayFieldSum,
  parseDateFilter,
  stringToObjectId,
} from '../../utils/util.js';
import * as PDF from '../../services/pdf.js';

export const getOverview = async (req, res) => {
  const [data, cancelled] = await Promise.all([
    Order.aggregate()
      .match({ 'captain.captain': stringToObjectId(req.user.id) })
      .group({
        _id: '$status',
        count: { $sum: 1 },
      }),
    Order.countDocuments({
      'captain.captain': req.user.id,
      status: 'cancelled',
      'captain.isHandedOverToManager': false,
    }),
  ]);

  const meta = data.reduce(
    (previous, current) => {
      previous[current._id] = current.count;
      previous.total = current.count || 0;
      return previous;
    },
    { total: 0 }
  );

  res.json({
    assigned: meta.assigned || 0,
    packed: meta.packed || 0,
    shipped: meta.shipped | 0,
    cancelled: cancelled,
    reports: meta.total,
  });
};

export const getOrders = async (req, res) => {
  const { offset, limit, status, reorders, from, to } = req.query;
  const isReOrder = reorders == 'true';

  const query = Order.find({
    'captain.captain': req.user.id,
    ...parseDateFilter(from, to),
  }).transform((data) =>
    data.map((values) => ({
      id: values._id,
      orderId: values.orderId,
      address: values.shipping?.address,
      estimatedDeliveryDate: values.shipping?.estimatedDeliveryDate || null,
      agentName: values.captain?.agentName || null,
      status: values.status,
      cancelledAt: values.cancelledAt || null,
      createdAt: values.createdAt,
    }))
  );

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));
  if (isReOrder) query.where({ isReturnOrder: true });

  switch (status) {
    case 'assigned':
    case 'packed':
    case 'shipped':
      query.where({ status });
      break;
    case 'cancelled':
      query.where({
        status: 'cancelled',
        'captain.isHandedOverToManager': false,
      });
      break;
  }

  const data = await query.lean({ getters: true });

  res.json(data);
};

export const getOrderById = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.captain': req.user.id,
  })
    .populate('user')
    .lean({ getters: true });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: order.id,
    orderId: order.orderId,
    address: order.shipping.address,
    estimatedDeliveryDate: order.shipping?.estimatedDeliveryDate || null,
    agentName: order.captain?.agentName || null,
    agentSignature: order.captain?.agentSignature || null,
    agentImage: order.captain?.agentImage || null,
    invoiceImage: order.captain?.invoiceImage || null,
    packageImage: order.captain?.packageImage || null,
    docketNo: order.shipping?.docketNo || null,
    brnNo: order.shipping?.brnNo || null,
    items: order.items.map((item) => ({
      id: item.product,
      title: item.title,
      image: item.image,
      quantity: item.quantity,
    })),
    status: order.status,
    cancelledAt: order.cancelledAt || null,
    createdAt: order.createdAt,
  });
};

export const packOrder = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.captain': req.user.id,
  }).populate('user');

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'assigned')
    throw new APIError('order is already packed');

  order.captain.invoiceImage = req.body.invoiceImage;
  order.captain.packageImage = req.body.packageImage;

  const shipment = await createShipment({
    fromAddress: order.merchant,
    toAddress: order.shipping.address,
    netWeight: getArrayFieldSum(order.items, 'weight'),
    netValue: order.totalAmount,
  });

  order.shipping.docketNo = shipment.docketNo;
  order.shipping.trackingUrl = shipment.trackingUrl;
  order.shipping.brnNo = shipment.brnNo;
  order.shipping.estimatedDeliveryDate = shipment.estimatedDeliveryDate;
  order.captain.agentName = 'Unknown';
  order.packedAt = new Date();
  order.status = 'packed';

  notify({
    type: NotificationType.ORDER_DISPATCHED,
    email: order.user?.email,
    mobile: order.user?.mobile,
    deviceToken: order.user?.deviceToken,
    data: {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      trackingUrl: order.shipping.trackingUrl,
    },
  });

  await order.save();

  res.status(201).json({
    trackingUrl: order.shipping.trackingUrl,
  });
};

export const shipOrder = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.captain': req.user.id,
  }).populate('user');

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'packed') throw new APIError('order is already shipped');

  order.captain.agentName = req.body.agentName;
  order.captain.agentImage = req.body.agentImage;
  order.captain.agentDocument = req.body.agentDocument;
  order.shippedAt = new Date();
  order.status = 'shipped';

  notify({
    type: NotificationType.ORDER_SHIPPED,
    email: order.user?.email,
    mobile: order.user?.mobile,
    deviceToken: order.user?.deviceToken,
    data: {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      trackingUrl: order.shipping.trackingUrl,
    },
  });

  await order.save();

  res.status(201).json({
    estimatedDeliveryDate: order.shipping.estimatedDeliveryDate,
  });
};

export const notifyManager = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.captain': req.user.id,
  }).populate('captain.manager');

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'cancelled')
    throw new APIError('order is not in cancelled status');

  if (order.captain.isHandedOverToManager)
    throw new APIError('order is already handed over to manager');

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  order.captain.otp = otp;

  sendOTP(order.captain.manager.mobile, otp);

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const handOverOrder = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.captain': req.user.id,
  }).populate('captain.manager');
  const isValidOTP = order?.captain.otp === req.body.otp;

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'cancelled')
    throw new APIError('order is not in cancelled status');

  if (order.captain.isHandedOverToManager)
    throw new APIError('order is already handed over to manager');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  order.captain.openingVideo = req.body.openingVideo;
  order.captain.isHandedOverToManager = true;
  order.handedOverAt = new Date();

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getReports = async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const download = req.query.download;

  const query = Order.find({
    'captain.captain': req.user.id,
    ...parseDateFilter(from, to),
  });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  if (req.query.status) {
    const status = req.query.status.split(',');
    query.where({ status });
  }

  const data = await query.lean();

  if (download) {
    const pdf = PDF.generateTable({
      title: 'Delivery Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Date',
          property: 'date',
          width: 80,
        },
        {
          label: 'Status',
          property: 'status',
          width: 80,
        },
      ],
      data: data.map((item) => ({
        orderId: item.orderId,
        date: dayjs(item.createdAt).format('DD/MM/YYYY'),
        status: item.status,
      })),
    });

    const stream = res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-disposition': `attachment;filename=reports.pdf`,
    });
    pdf.on('data', (chunk) => stream.write(chunk));
    pdf.on('end', () => stream.end());
    return;
  }

  res.json(
    orderBy(
      Object.entries(groupBy(data, 'status')).map((array) => ({
        status: array[0],
        data: array[1],
      })),
      function (item) {
        switch (item.status) {
          case 'placed':
            return 1;
          case 'assigned':
            return 2;
          case 'packed':
            return 3;
          case 'shipped':
            return 4;
          case 'delivered':
            return 5;
          case 'cancelled':
            return 6;
        }
      },
      'asc'
    )
  );
};
