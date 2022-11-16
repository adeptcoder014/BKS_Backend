import cryptoRandomString from 'crypto-random-string';
import dayjs from 'dayjs';
import groupBy from 'lodash/groupBy.js';
import orderBy from 'lodash/orderBy.js';
import Order from '../../models/order.js';
import ReturnOrder from '../../models/returnOrder.js';
import { sendOTP } from '../../services/sms.js';
import APIError from '../../utils/error.js';
import {
  calculateDiff,
  generateOrderId,
  generateOtp,
  generateQrCode,
  getArrayFieldSum,
  parseDateFilter,
} from '../../utils/util.js';
import { createShipment } from '../../services/logistic.js';
import logger from '../../utils/logger.js';
import notify, { NotificationType } from '../../utils/notification.js';
import * as PDF from '../../services/pdf.js';
import { getS3KeyFromUrl, getS3Url } from '../../services/s3.js';
import Appointment from '../../models/appointment.js';
import VerifiedGold from '../../models/verifiedGold.js';
import RefinedGold from '../../models/refinedGold.js';
import GoldBox from '../../models/goldBox.js';
import MerchantUser from '../../models/merchantUser.js';
import SecurityBag from '../../models/securityBag.js';
import Merchant from '../../models/merchant.js';
import roundValue from '../../utils/roundValue.js';
import Gold from '../../models/gold.js';
import mongoose from 'mongoose';

export const getCaptains = async (req, res) => {
  const query = MerchantUser.find({
    merchant: req.user.merchant,
    role: 'captain',
  })
    .select('fullName email modules')
    .lean();

  if (req.query.modules) {
    query.where({ modules: req.query.modules });
  }

  const data = await query;

  res.json(data);
};

/**      DELIVERY MODULE     */
export const getDeliveryOverview = async (req, res) => {
  const [newOrders, shipped, cancelled, reports] = await Promise.all([
    Order.countDocuments({
      'captain.manager': req.user.id,
      status: ['placed', 'assigned', 'packed'],
    }),
    Order.countDocuments({
      'captain.manager': req.user.id,
      status: ['shipped', 'delivered'],
    }),
    Order.countDocuments({
      'captain.manager': req.user.id,
      status: 'cancelled',
      isRefunded: false,
    }),
    Order.countDocuments({
      'captain.manager': req.user.id,
    }),
  ]);

  res.json({
    newOrders,
    shipped,
    cancelled,
    reports,
  });
};

export const getDeliveryOrders = async (req, res) => {
  const { from, to, q, status, offset, limit } = req.query;

  const query = Order.find({
    ...parseDateFilter(from, to),
    'captain.manager': req.user.id,
  }).populate('captain.captain');

  switch (status) {
    case 'cancelled':
      query.where({
        status: 'cancelled',
        'captain.isHandedOverToManager': false,
      });
      break;
    default:
      if (status) {
        query.where({ status });
      }
  }

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));
  if (q) query.where({ docketNo: new RegExp(q, 'i') });

  const data = await query.lean({ getters: true }).transform((docs) =>
    docs.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      docketNo: item.shipping.docketNo,
      brnNo: item.shipping.brnNo,
      agentName: item.captain.agentName || '',
      captainName: item.captain.captain?.fullName || '',
      isSelf: item.captain.manager._id.equals(item.captain.captain?._id),
      isHandedOver: item.captain.isHandedOverToManager || false,
      assignedAt: item.assignedAt || '',
      packedAt: item.packedAt || '',
      shippedAt: item.shippedAt || '',
      deliveredAt: item.deliveredAt || '',
      cancelledAt: item.cancelledAt || '',
      handedOverAt: item.handedOverAt || '',
      createdAt: item.createdAt,
      status: item.status,
    }))
  );

  res.json(data);
};

export const getDeliveryOrderById = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.manager': req.user.id,
  })
    .lean({ getters: true })
    .populate('captain.captain');

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  return res.json({
    id: order.id,
    orderId: order.orderId,
    docketNo: order.shipping.docketNo || '',
    brnNo: order.shipping.brnNo || '',
    estimatedDeliveryDate: order.shipping.estimatedDeliveryDate,
    isHandedOver: order.captain.isHandedOverToManager || false,
    otp: (order.status === 'cancelled' ? order.otp : '') || '',
    items: order.items.map((item) => ({
      id: item.product?._id ?? item.product?.id,
      title: item.title,
      image: item.image,
      quantity: item.quantity,
      isReviewed:
        (item.status === 'cancelled'
          ? item.afterHandOver?.isReviewed
          : item.beforeHandOver?.isReviewed) || false,
    })),
    captainName: order.captain.captain?.fullName || '',
    agentName: order.captain.agentName || '',
    openingVideo: order.captain.openingVideo || '',
    packageImage: order.captain.packageImage || '',
    invoiceImage: order.captain.invoiceImage || '',
    agentImage: order.captain.agentImage || '',
    agentDocument: order.captain.agentDocument || '',
    assignedAt: order.assignedAt || '',
    packedAt: order.packedAt || '',
    shippedAt: order.shippedAt || '',
    deliveredAt: order.deliveredAt || '',
    cancelledAt: order.cancelledAt || '',
    handedOverAt: order.handedOverAt || '',
    createdAt: order.createdAt,
    status: order.status,
  });
};

export const reviewDeliveryItem = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.manager': req.user.id,
  });

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  const item = order.items.find((product) =>
    product.product.equals(req.params.itemId)
  );

  if (!item) throw new APIError('item does not exist');
  if (!item.beforeHandOver) item.beforeHandOver = {};
  if (!item.afterHandOver) item.afterHandOver = {};

  switch (order.status) {
    case 'placed':
      item.beforeHandOver.quantity = req.body.quantity;
      item.beforeHandOver.weight = req.body.weight;
      item.beforeHandOver.weightScaleImage = req.body.weightScaleImage;
      item.beforeHandOver.isReviewed = true;
      break;
    case 'cancelled':
      item.afterHandOver.quantity = req.body.quantity;
      item.afterHandOver.weight = req.body.weight;
      item.afterHandOver.weightScaleImage = req.body.weightScaleImage;
      item.afterHandOver.isReviewed = true;
      break;
    default:
      throw new APIError('bad request');
  }

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const notifyDeliveryCaptain = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.manager': req.user.id,
  });
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);
  if (!captain)
    throw new APIError('captain does not exist', APIError.RESOURCE_NOT_FOUND);
  if (order.status !== 'placed')
    throw new APIError('order is already handed over to captain');

  if (order.items.find((item) => !item.beforeHandOver?.isReviewed))
    throw new APIError('Please review all items');

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await sendOTP(captain.mobile, otp);

  order.captain.otp = otp;

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const assignDeliveryOrder = async (req, res) => {
  const order = await Order.findById({
    _id: req.params.id,
    'captain.manager': req.user.id,
  });

  const isSelf = req.user.id.equals(req.body.captain);
  const isValidOTP = order?.captain.otp === req.body.otp;

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);
  if (order.status !== 'placed')
    throw new APIError('order is already handed over to captain');

  if (!isSelf && !isValidOTP)
    throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  order.captain.captain = req.body.captain;
  order.assignedAt = new Date();
  order.status = 'assigned';

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const packDeliveryOrder = async (req, res) => {
  const order = await Order.findById({
    _id: req.params.id,
    'captain.manager': req.user.id,
  }).populate('user');

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);
  if (order.status !== 'assigned')
    throw new APIError('order is already assigned to captain');

  order.captain.invoiceImage = req.body.invoiceImage;
  order.captain.packageImage = req.body.packageImage;

  const [err, shipment] = await createShipment({
    user: order.user,
    address: order.shipping.address,
    total: order.totalAmount,
    netWeight: getArrayFieldSum(order.items, 'weight'),
  });

  if (err) {
    logger.error(err);
    throw new APIError(
      'Unable to upload order due to shipment server issue, try again later',
      APIError.SHIPMENT_SERVER_ERROR
    );
  }

  if (shipment.status === 'false') {
    logger.error(shipment.errorInfo);
    throw new APIError(
      'Invalid request data',
      APIError.SHIPMENT_INVALID_REQUEST
    );
  }

  order.shipping.docketNo = shipment.data.docket_number;
  order.shipping.trackingUrl = `${process.env.SEQUEL_API_URL}/track/${order.shipping.docketNo}`;
  order.shipping.brnNo = shipment.data.brn;
  order.shipping.estimatedDeliveryDate = dayjs(
    shipment.data.estiimated_delivery,
    'DD-MM-YYYY'
  ).toDate();
  order.captain.agentName = shipment.data.senders_name || 'Unknown';
  order.captain.captain = req.user.id;
  order.assignedAt = new Date();
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
    message: 'success',
  });
};

export const shipDeliveryOrder = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'captain.manager': req.user.id,
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

export const getDeliveryReports = async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const self = req.query.self === 'true';
  const captains = req.query.captains;
  const download = req.query.download;

  const query = Order.find({
    'captain.manager': req.user.id,
    ...parseDateFilter(from, to),
  }).populate('captain.captain');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (self) query.where({ 'captain.captain': req.user.id });
  if (captains) query.where({ 'captain.captain': captains.split(',') });

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
          label: 'Captain',
          property: 'captain',
          width: 100,
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
        captain: item.captain.captain?.fullName ?? '-',
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

/**     RETURN MODULE      */
export const getReturnOverview = async (req, res) => {
  const [returns, recheck, refund, reorder] = await Promise.all([
    ReturnOrder.countDocuments({
      manager: req.user.id,
      status: ['placed', 'received', 'assigned'],
    }),
    ReturnOrder.countDocuments({
      manager: req.user.id,
      status: 'checked',
    }),
    ReturnOrder.countDocuments({
      manager: req.user.id,
      status: 'completed',
    }),
    ReturnOrder.countDocuments({
      manager: req.user.id,
      reorder: { $exists: true },
    }),
  ]);

  res.json({
    returns,
    recheck,
    refund,
    reorder,
    reports: returns + recheck + refund + reorder,
  });
};

export const getReturnOrders = async (req, res) => {
  const { limit, offset, status, q, from, to, items } = req.query;

  const query = ReturnOrder.find({
    ...parseDateFilter(from, to),
    manager: req.user.id,
  }).populate('captain');

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));
  if (status) query.where({ status });
  if (q)
    query.where({
      [items === 'true' ? 'orderId' : 'docketNo']: new RegExp(q, 'i'),
    });

  const data = await query.lean({ getters: true });

  if (items === 'true') {
    res.json(
      data.reduce((prev, curr) => {
        for (const item of curr.items) {
          prev.push({
            title: item.title,
            image: item.image,
            status: item.status,
            orderId: curr.orderId,
          });
        }

        return prev;
      }, [])
    );
  }

  res.json(
    data.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      docketNo: item.docketNo,
      brnNo: item.brnNo,
      estimatedDeliveryDate: item.estimatedDeliveryDate || '',
      agentName: item.agentName || '',
      captainName: item.captain?.fullName || '',
      isSelf: item.captain?._id.equals(req.user.id),
      createdAt: item.createdAt,
      receivedAt: item.receivedAt || '',
      assignedAt: item.assignedAt || '',
      checkedAt: item.checkedAt || '',
      handedOverAt: item.handedOverAt || '',
      completedAt: item.completedAt || '',
      status: item.status,
    }))
  );
};

export const getReturnOrderById = async (req, res) => {
  const order = await ReturnOrder.findOne({
    _id: req.params.id,
    manager: req.user.id,
  })
    .populate(['captain', 'user'])
    .lean({ getters: true });

  if (!order)
    throw new APIError('order does not exist', APIError.RESOURCE_NOT_FOUND);

  res.json({
    id: order.id,
    orderId: order.orderId,
    docketNo: order.docketNo,
    brnNo: order.brnNo,
    estimatedDeliveryDate: order.estimatedDeliveryDate || '',
    agentName: order.agentName || '',
    captainName: order.captain?.fullName,
    customerName: order.user?.fullName,
    isSelf: order.captain?.id.equals(req.user.id),
    packageImage: order.packageImage,
    openingVideo: order.openingVideo || '',
    items: order.items.map((item) => ({
      id: item.product?._id,
      title: item.title,
      image: item.image,
      quantity: item.quantity,
      amount: item.totalAmount,
      returnedReason: item.returnedReason,
      rejectedReason:
        item.manager?.rejectedReason ||
        item.captain?.rejectedReason ||
        item.rejectedReason,
      status: item.manager?.status || item.captain?.status || item.status,
    })),
    reorderId: order.reorder || '',
    createdAt: order.createdAt,
    receivedAt: order.receivedAt || '',
    assignedAt: order.assignedAt || '',
    checkedAt: order.checkedAt || '',
    handedOverAt: order.handedOverAt || '',
    completedAt: order.completedAt || '',
    status: order.status,
  });
};

export const getReturnReorders = async (req, res) => {
  const { from, to, q, status, offset, limit } = req.query;

  const query = Order.find({
    ...parseDateFilter(from, to),
    'captain.manager': req.user.id,
    isReturnOrder: true,
  }).populate('captain.captain');

  if (status) query.where({ status });

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));
  if (q) query.where({ docketNo: new RegExp(q, 'i') });

  const data = await query.lean({ getters: true }).transform((docs) =>
    docs.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      docketNo: item.shipping.docketNo,
      brnNo: item.shipping.brnNo,
      estimatedDeliveryDate: item.shipping.estimatedDeliveryDate || '',
      agentName: item.captain.agentName || '',
      captainName: item.captain.captain?.fullName || '',
      isSelf: item.captain.manager._id.equals(item.captain.captain?._id),
      isHandedOver: item.captain.isHandedOverToManager || false,
      assignedAt: item.assignedAt || '',
      packedAt: item.packedAt || '',
      shippedAt: item.shippedAt || '',
      deliveredAt: item.deliveredAt || '',
      cancelledAt: item.cancelledAt || '',
      handedOverAt: item.handedOverAt || '',
      createdAt: item.createdAt,
      status: item.status,
    }))
  );

  res.json(data);
};

export const receiveReturnOrder = async (req, res) => {
  const data = await ReturnOrder.findOne({
    _id: req.params.id,
    manager: req.user.id,
  });

  if (!data) throw new Error('order does not exist');
  if (data.status !== 'placed') throw new APIError('bad request');

  data.agentName = req.body.agentName;
  data.agentImage = req.body.agentImage;
  data.agentDocument = req.body.agentDocument;
  data.packageImage = req.body.packageImage;
  data.receivedAt = new Date();
  data.status = 'received';

  res.status(201).json({
    message: 'success',
  });
};

export const notifyReturnCaptain = async (req, res) => {
  const orders = await ReturnOrder.find({
    _id: req.body.ids,
    manager: req.user.id,
  }).lean();
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain)
    throw new APIError('captain does not exist', APIError.RESOURCE_NOT_FOUND);

  for (const order of orders) {
    if (order.status !== 'received')
      throw new APIError(`Order ${order.orderId} is ${order.status}`);
  }

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await ReturnOrder.updateMany(
    { _id: req.body.ids },
    {
      otp,
    }
  );

  await sendOTP(captain.mobile, otp);

  res.status(201).json({
    message: 'success',
  });
};

export const assignReturnCaptain = async (req, res) => {
  const orders = await ReturnOrder.find({ _id: req.body.ids }).lean();
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain)
    throw new APIError('captain does not exist', APIError.RESOURCE_NOT_FOUND);

  for (const order of orders) {
    if (order.status !== 'received')
      throw new APIError(`Order ${order.orderId} is ${order.status}`);
    if (!captain.id.equals(req.user.id) && order.otp !== req.body.otp)
      throw new APIError('Invalid OTP', APIError.INVALID_OTP);
  }

  await ReturnOrder.updateMany(
    { _id: req.body.ids },
    {
      otp: '',
      captain: captain.id,
      assignedAt: new Date(),
      status: 'assigned',
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

export const recheckReturnOrderItem = async (req, res) => {
  const order = await ReturnOrder.findOne({
    manager: req.user.id,
    _id: req.params.id,
  });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'checked')
    throw new APIError('order is not checked yet');

  const item = order.items.find((item) =>
    item.product.equals(req.params.itemId)
  );
  if (!item) throw new APIError('item not found');

  item.checkingVideo = req.body.checkingVideo;
  item.manager.checkingVideo = req.body.checkingVideo;

  switch (req.body.status) {
    case 'accepted':
      item.status = 'accepted';
      item.manager.status = 'accepted';
      break;
    case 'rejected':
      item.status = 'rejected';
      item.manager.status = 'rejected';
      item.rejectedReason = req.body.rejectedReason;
      item.manager.rejectedReason = req.body.rejectedReason;
      break;
  }

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const processReturnOrder = async (req, res) => {
  const order = await ReturnOrder.findOne({
    manager: req.user.id,
    _id: req.params.id,
  });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'checked') throw new APIError('bad request');

  const reorder = new Order({
    orderId: generateOrderId(),
    returnOrder: order.id,
    isReturnOrder: true,
    merchant: order.merchant,
    captain: {
      manager: order.manager,
    },
    user: order.user,
    shipping: {
      address: order.address,
    },
  });

  for (const item of order.items) {
    if (!item.manager?.status) {
      item.status = item.captain.status;
      if (item.status === 'rejected')
        item.rejectedReason = item.captain.rejectedReason;
    }

    if (item.status === 'rejected') {
      reorder.items.push({
        product: item.product,
        title: item.title,
        image: getS3KeyFromUrl(item.image),
        purity: item.purity,
        weight: item.weight,
        quantity: item.quantity,
        rate: item.rate,
        makingCharge: item.makingCharge,
        tax: item.tax,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
      });
    }
  }

  order.completedAt = new Date();
  order.status = 'completed';

  if (reorder.items.length) {
    order.reorder = reorder.id;
    await reorder.save();
  }

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getReturnReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const self = req.query.self === 'true';
  const captains = req.query.captains;
  const download = req.query.download;

  const query = ReturnOrder.find({
    manager: req.user.id,
    ...parseDateFilter(req.query.from, req.query.to),
  })
    .populate('captain', 'fullName')
    .select({
      orderId: 1,
      docketNo: 1,
      captain: 1,
      manager: 1,
      createdAt: 1,
      receivedAt: 1,
      assignedAt: 1,
      checkedAt: 1,
      completedAt: 1,
      status: 1,
    });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (self) query.where({ captain: req.user.id });
  if (captains) query.where({ captain: captains.split(',') });

  if (req.query.status) {
    const status = req.query.status.split(',');
    query.where({ status });
  }

  const data = await query.lean();

  if (download) {
    const pdf = PDF.generateTable({
      title: 'Return Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Captain',
          property: 'captain',
          width: 100,
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
        captain: item.captain?.fullName ?? '-',
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
          case 'received':
            return 2;
          case 'assigned':
            return 3;
          case 'checked':
            return 4;
          case 'completed':
            return 5;
        }
      },
      'asc'
    )
  );
};

/** VERIFIER */
export const getVerifierOverview = async (req, res) => {
  const [
    toBeScheduled,
    toBeRescheduled,
    toBeAssigned,
    toBeChecked,
    toBePacked,
    toBeShipped,
    cancelled,
  ] = await Promise.all([
    Appointment.countDocuments({
      manager: req.user.id,
      status: 'requested',
    }),
    Appointment.countDocuments({
      manager: req.user.id,
      lastScheduledBy: 'user',
      status: 'reschedule_requested',
    }),
    VerifiedGold.countDocuments({
      'manager.id': req.user.id,
      status: 'placed',
    }),
    VerifiedGold.countDocuments({
      'manager.id': req.user.id,
      status: 'submitted',
    }),
    VerifiedGold.countDocuments({
      'manager.id': req.user.id,
      status: 'checked',
    }),
    GoldBox.countDocuments({
      'verifier.manager': req.user.id,
      status: 'packed',
    }),
    Appointment.countDocuments({
      manager: req.user.id,
      status: 'cancelled',
    }),
  ]);

  res.json({
    toBeScheduled,
    toBeRescheduled,
    toBeAssigned,
    toBeChecked,
    toBePacked,
    toBeShipped,
    cancelled,
    reports: 0,
  });
};

export const getBookedSlots = async (req, res) => {
  const filter = {};

  if (req.query.date) {
    filter.scheduledDate = {
      $gt: dayjs(req.query.date, 'DD/MM/YYYY').startOf('day').toDate(),
      $lt: dayjs(req.query.date, 'DD/MM/YYYY').endOf('day').toDate(),
    };
  } else {
    filter.scheduledDate = {
      $gt: new Date(),
    };
  }

  const data = await Appointment.find({
    status: 'booked',
    ...filter,
  });

  res.json(
    data.map((item) => ({
      date: dayjs(item.scheduledDate).get('date'),
      hour: dayjs(item.scheduledDate).get('hour'),
      minute: dayjs(item.scheduledDate).get('minute'),
      scheduledDate: item.scheduledDate,
    }))
  );
};

export const getVerifierAppointments = async (req, res) => {
  const { from, to, status } = req.query;
  const query = Appointment.find({
    manager: req.user.id,
    ...parseDateFilter(from, to),
  }).populate('metalGroup');

  switch (status) {
    case 'requested':
      query.where({ status: 'requested' });
      break;
    case 'reschedule_requested':
      query.where({ status: 'reschedule_requested', lastScheduledBy: 'user' });
      break;
    case 'cancelled_before_verification':
      query.where({
        status: 'cancelled',
        cancelledStage: 'before_verification',
      });
      break;
    case 'cancelled_before_melting':
      query.where({
        status: 'cancelled',
        cancelledStage: 'before_melting',
      });
      break;
    case 'cancelled_after_melting':
      query.where({
        status: 'cancelled',
        cancelledStage: 'after_melting',
      });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      type: item.type,
      requestedDate: item.requestedDate,
      scheduledDate: item.scheduledDate ?? '',
      cancelledDate: item.cancelledAt ?? '',
      weight: item.weight,
      metalGroup: item.metalGroup?.shortName.split('KT')[0].trim(),
      status: item.status,
    }))
  );
};

export const getVerifierAppointmentById = async (req, res) => {
  const query = Appointment.findOne({
    _id: req.params.id,
    manager: req.user.id,
  })
    .populate('metalGroup')
    .populate({
      path: 'verifiedGold',
      populate: [
        'manager.id',
        'captain.id',
        'vehicle',
        'securityGuards',
        'items.styles.style',
      ],
    });

  const getDetails = (item) => {
    if (!item) return null;
    const netWeight = item.captain.netWeight || item.beforeMelting.netWeight;
    return {
      managerName: item.manager.id?.fullName ?? '',
      captainName: item.captain.id?.fullName ?? '',
      vehicleNumber: item.vehicle?.number,
      securityGuards: item.securityGuards.map((e) => e.fullName),
      status: item.status,
      items: item.items.map((e) => ({
        ...e,
        styles: e.styles.map((style) => ({
          ...style,
          style: style.style?.name,
          amount:
            style.rate *
            (style.rateAppliedOn === 'weight'
              ? style.weight
              : style.pieceCount),
        })),
      })),
      netWeight,
      netPurity: item.captain.netPurity || item.beforeMelting.netPurity,
      offerPrice: roundValue(netWeight * item.sellRate, 2),
      uploadOffer: item.captain.netWeight || item.beforeMelting.netWeight,
      customerDecision: 'rejected',
      sellRate: item.sellRate ?? 0,
    };
  };

  const data = await query.lean();

  res.json({
    id: data.id,
    orderId: data.orderId,
    type: data.type,
    requestedDate: data.requestedDate,
    scheduledDate: data.scheduledDate ?? '',
    cancelledDate: data.cancelledAt ?? '',
    weight: data.weight,
    metalGroup: data.metalGroup?.shortName.split('KT')[0].trim(),
    status: data.status,
    data: getDetails(data.verifiedGold),
  });
};

export const acceptVerifierAppointment = async (req, res) => {
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    manager: req.user.id,
  });

  if (!appointment) throw new APIError('appointment does not exist');
  if (!['requested', 'reschedule_requested'].includes(appointment.status))
    throw new APIError('bad request');

  if (!appointment.scheduledDate)
    appointment.scheduledDate = appointment.requestedDate;
  appointment.status = 'booked';

  await VerifiedGold.create({
    orderId: generateOrderId(),
    appointment: appointment._id,
    metalGroup: appointment.metalGroup,
    merchant: appointment.merchant,
    manager: {
      id: appointment.manager,
    },
    events: [
      {
        name: 'requested',
        createdAt: appointment.createdAt,
      },
      {
        name: 'booked',
        createdAt: new Date(),
      },
    ],
    status: 'placed',
  });

  await appointment.save();

  res.status(201).json({
    message: 'success',
  });
};

export const rescheduleVerifierAppointment = async (req, res) => {
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    manager: req.user.id,
  });

  if (!appointment) throw new APIError('appointment does not exist');
  if (!['requested', 'reschedule_requested'].includes(appointment.status))
    throw new APIError('bad request');

  appointment.scheduledDate = dayjs(
    req.body.date + ' ' + req.body.time,
    'DD/MM/YYYY HH/mm'
  ).toDate();
  appointment.lastScheduledBy = 'merchant';

  await appointment.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getVerifierOrders = async (req, res) => {
  const { offset, limit, status, from, to } = req.query;
  const query = VerifiedGold.find({
    'manager.id': req.user.id,
    ...parseDateFilter(from, to),
  })
    .populate('appointment')
    .populate('metalGroup');

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));

  switch (status) {
    case 'toBeAssigned':
      query.where({ status: 'placed' });
      break;
    case 'toBeChecked':
      query.where({ status: 'submitted' });
      break;
    case 'toBePacked':
      query.where({ status: 'checked' });
      break;
  }

  query.transform((data) =>
    data.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      agentName: 'Unknown',
      weight:
        item.status === 'checked'
          ? item.manager?.netWeight || item.captain.netWeight
          : 0,
      scheduledAt: item.appointment?.scheduledDate || '',
      verifiedAt: item.verifiedAt || '',
      receivedAt: item.submittedAt || '',
      createdAt: item.createdAt,
    }))
  );

  const data = await query.lean();

  res.json(data);
};

export const getVerifierOrderById = async (req, res) => {
  const data = await VerifiedGold.findById(req.params.id)
    .populate('appointment')
    .populate('metalGroup')
    .lean();

  if (!data)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data.id,
    orderId: data.orderId,
    scheduledAt: data.appointment.scheduledDate,
    weight: data.appointment.weight,
    metalGroup: data.metalGroup?.shortName.split('KT')[0],
    createdAt: data.createdAt,
    status: data.status,
  });
};

export const notifyVerifierCaptain = async (req, res) => {
  const orders = await VerifiedGold.find({ _id: req.body.ids }).lean();
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain)
    throw new APIError('captain does not exist', APIError.RESOURCE_NOT_FOUND);

  for (const order of orders) {
    if (order.status !== 'placed')
      throw new APIError(`Order ${order.orderId} is ${order.status}`);
  }

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await VerifiedGold.updateMany(
    { _id: req.body.ids },
    {
      otp,
    }
  );

  await sendOTP(captain.mobile, otp);

  res.status(201).json({
    message: 'success',
  });
};

export const assignVerifierCaptain = async (req, res) => {
  const orders = await VerifiedGold.find({ _id: req.body.ids }).lean();
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain)
    throw new APIError('captain does not exist', APIError.RESOURCE_NOT_FOUND);

  for (const order of orders) {
    if (order.status !== 'placed')
      throw new APIError(`Order ${order.orderId} is ${order.status}`);
    if (!captain.id.equals(req.user.id) && order.otp !== req.body.otp)
      throw new APIError('Invalid OTP', APIError.INVALID_OTP);
  }

  await VerifiedGold.updateMany(
    { _id: req.body.ids },
    {
      otp: '',
      'captain.id': captain.id,
      assignedAt: new Date(),
      status: 'assigned',
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

const maxPercent = 10;

export const getVerifiedBagDifference = async (req, res) => {
  const order = await VerifiedGold.findOne({ qrCode: req.query.qrCode });

  if (!order)
    throw new APIError('bag does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  if (!req.query.weight) throw new APIError('weight is required');

  const diff = calculateDiff(order.captain.bagWeight, req.query.weight);

  res.json({
    difference: diff,
    recheck: diff >= maxPercent,
  });
};

export const sendToVerifierWarehouse = async (req, res) => {
  const order = await VerifiedGold.findOne({ qrCode: req.body.qrCode });
  if (!order)
    throw new APIError('bag does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  const diff = calculateDiff(order.captain.bagWeight, req.body.weight);

  if (diff >= maxPercent) throw new APIError('Please recheck the bag');

  order.manager.bagWeight = req.body.weight;
  order.manager.bagWeightScaleImage = req.body.image;
  order.checkedAt = new Date();
  order.status = 'checked';

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const recheckVerifiedBag = async (req, res) => {
  const order = await VerifiedGold.findOne({ qrCode: req.body.qrCode });
  if (!order)
    throw new APIError('bag does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  const bag = await SecurityBag.findOne({ serialNumber: req.body.bagQrCode });
  if (!bag) throw new APIError('bag does not exist');
  if (bag.status !== 'available') throw new APIError('bag already used');

  // req.body.actualWeight;
  // req.body.actualWeightScaleImage;

  order.manager.openingVideo = req.body.openingVideo;
  order.manager.purityCheckingVideo = req.body.purityCheckingVideo;
  order.manager.purityScaleImage = req.body.purityScaleImage;
  order.manager.bag = bag.id;
  order.manager.bagWeightScaleImage = req.body.bagWeightScaleImage;
  order.manager.bagWeight = req.body.bagWeight;
  order.manager.netPurity = req.body.purity;

  order.checkedAt = new Date();
  order.status = 'checked';

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const packVerifiedBags = async (req, res) => {
  const data = await VerifiedGold.find({
    _id: req.body.ids.split(','),
  });

  const merchant = await Merchant.findById(req.user.merchant).lean();

  const refiner = await Merchant.findOne({
    modules: 'refiner',
    // location: {
    //   $near: merchant.location.coordinates,
    // },
  });

  const manager = await MerchantUser.findOne({
    merchant: refiner.id,
    role: 'manager',
    modules: 'refiner',
  }).lean();

  const bag = await SecurityBag.findOne({ serialNumber: req.body.qrCode });

  if (!merchant) throw new APIError('merchant does not exist');
  if (!bag) throw new APIError('bag does not exist');
  if (bag.status !== 'available') throw new APIError('bag is already used');
  if (!refiner) throw new APIError('Could not find nearest refiner');
  if (!manager) throw new APIError('No manager in refiner');

  const [err, shipment] = await createShipment({
    user: {
      fullName: manager.fullName,
      mobile: manager.mobile,
    },
    address: refiner.address,
    total: 0,
    netWeight: data.reduce((count, item) => {
      count += item.manager?.netWeight || item.captain.netWeight;
      return count;
    }, 0),
  });

  if (err) {
    logger.error(err);
    throw new APIError(
      'Unable to upload order due to shipment server issue, try again later',
      APIError.SHIPMENT_SERVER_ERROR
    );
  }

  if (shipment.status === 'false') {
    logger.error(shipment.errorInfo);
    throw new APIError(
      'Invalid request data',
      APIError.SHIPMENT_INVALID_REQUEST
    );
  }

  const ids = data.map((item) => item.id);

  const box = new GoldBox({
    qrCode: bag.serialNumber,
    orderId: generateOrderId(),
    itemType: 'verifiedGold',
    docketNo: shipment.data.docket_number,
    brnNo: shipment.data.brn,
    trackingUrl: `${process.env.SEQUEL_API_URL}/track/${data.docketNo}`,
    estimatedDeliveryDate: dayjs(
      shipment.data.estiimated_delivery,
      'DD-MM-YYYY'
    ).toDate(),
    bag: bag.id,
    verifier: {
      merchant: merchant.id,
      manager: req.user.id,
      itemCount: data.length,
      weight: req.body.weight,
      weightScaleImage: req.body.image,
    },
    refiner: {
      merchant: refiner.id,
      manager: manager.id,
    },
    items: ids,
    packedAt: new Date(),
    status: 'packed',
  });

  await box.save();
  await VerifiedGold.updateMany(
    { _id: ids },
    {
      box: box.id,
      status: 'ready',
      refiner: {
        merchant: refiner.id,
        manager: manager.id,
      },
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

export const getVerifiedBoxes = async (req, res) => {
  const data = await GoldBox.find({
    'verifier.manager': req.user.id,
    itemType: 'verifiedGold',
    status: 'packed',
  }).lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      docketNo: item.docketNo,
      brnNo: item.brnNo,
      itemCount: item.verifier.itemCount,
      status: item.status,
    }))
  );
};

export const getVerifiedBoxById = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'verifier.manager': req.user.id,
  }).lean();

  if (!data) throw new APIError('box does not exist');

  res.json({
    id: data.id,
    orderId: data.orderId,
    docketNo: data.docketNo,
    brnNo: data.brnNo,
    itemCount: data.verifier.itemCount,
    status: data.status,
  });
};

export const shipVerifiedBox = async (req, res) => {
  const data = await GoldBox.findById({
    _id: req.params.id,
    'verifier.manager': req.user.id,
  });

  if (!data)
    throw new APIError('box does not exist', APIError.RESOURCE_NOT_FOUND, 404);
  if (data.status !== 'packed') throw new APIError('bad Request');

  data.verifier.agentName = req.body.agentName;
  data.verifier.agentImage = req.body.agentImage;
  data.verifier.agentDocument = req.body.agentDocument;

  data.shippedAt = new Date();
  data.status = 'shipped';

  await data.save();

  res.status(201).json({
    agentName: data.agentName,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
  });
};

export const getVerifierReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const captains = req.query.captains;
  const download = req.query.download;

  const query = VerifiedGold.find({
    'manager.id': req.user.id,
    ...parseDateFilter(req.query.from, req.query.to),
  })
    .populate('captain.id')
    .select('orderId captain.id createdAt status');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (captains) query.where({ 'captain.id': captains.split(',') });

  if (req.query.status) {
    const status = req.query.status.split(',');
    query.where({ status });
  }

  const data = await query.lean();

  if (download) {
    const pdf = PDF.generateTable({
      title: 'Verifier Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Captain',
          property: 'captain',
          width: 100,
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
        captain: item.captain?.id.fullName ?? '-',
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
        data: array[1].map((item) => ({
          id: item.id,
          orderId: item.orderId,
          captainName: item.captain?.id?.fullName ?? '',
          createdAt: item.createdAt,
          status: item.status,
        })),
      }))
    )
  );
};

/**  Refiner */
export const getRefinerOverview = async (req, res) => {
  const [toBeReceived, toBeAssigned, toBeChecked, toBePacked, toBeShipped] =
    await Promise.all([
      GoldBox.countDocuments({
        itemType: 'verifiedGold',
        'refiner.manager': req.user.id,
        status: 'shipped',
      }),
      GoldBox.countDocuments({
        itemType: 'verifiedGold',
        'refiner.manager': req.user.id,
        status: 'delivered',
      }),
      RefinedGold.countDocuments({
        manager: req.user.id,
        status: 'submitted',
      }),
      Gold.countDocuments({
        'manager.id': req.user.id,
        type: 'bar',
        status: 'checked',
      }),
      GoldBox.countDocuments({
        itemType: 'gold',
        'refiner.manager': req.user.id,
        status: 'packed',
      }),
    ]);

  res.json({
    toBeReceived,
    toBeAssigned,
    toBeChecked,
    toBePacked,
    toBeShipped,
    reports: 0,
  });
};

export const getRefinerOrders = async (req, res) => {
  const { offset, limit, status, from, to, q } = req.query;
  const query = GoldBox.find({
    itemType: 'verifiedGold',
    'refiner.manager': req.user.id,
    ...parseDateFilter(from, to),
  });

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));
  if (q) query.where({ docketNo: new RegExp(q, 'i') });

  switch (status) {
    case 'toBeReceived':
      query.where({ status: 'shipped' });
      break;
    case 'toBeAssigned':
      query.where({ status: 'delivered' });
      break;
    case 'toBeShipped':
      query.where({ itemType: 'gold', status: 'packed' });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      docketNo: item.docketNo,
      brnNo: item.brnNo,
      agentName: item.agentName ?? '',
      estimatedDeliveryDate: item.estimatedDeliveryDate,
      receivedAt: item.deliveredAt ?? '',
      createdAt: item.createdAt,
      status: item.status,
    }))
  );
};

export const getRefinerOrderById = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.manager': req.user.id,
  }).lean();

  if (!data)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data.id,
    orderId: data.orderId,
    docketNo: data.docketNo,
    brnNo: data.brnNo,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
    receivedAt: data.deliveredAt ?? '',
    createdAt: data.createdAt,
    status: data.status,
  });
};

export const receiveRefinerOrder = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.manager': req.user.id,
  });

  if (!data)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  data.refiner.agentName = req.body.agentName;
  data.refiner.agentImage = req.body.agentImage;
  data.refiner.agentDocument = req.body.agentDocument;
  data.refiner.packageImage = req.body.packageImage;

  data.deliveredAt = new Date();
  data.status = 'delivered';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const notifyRefinerCaptain = async (req, res) => {
  const data = await GoldBox.find({
    _id: req.body.ids,
    'refiner.manager': req.user.id,
  });
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain) throw new APIError('captain does not exist');

  const otp = generateOtp();

  for (const box of data) {
    if (box.status !== 'delivered')
      throw new APIError(`order ${box.orderId} is ${box.status}`);
  }

  await GoldBox.updateMany({ _id: req.body.ids }, { otp });
  await sendOTP(captain.mobile, otp);

  res.status(201).json({
    message: 'success',
  });
};

export const assignRefinerCaptain = async (req, res) => {
  const data = await GoldBox.find({
    _id: req.body.ids,
    'refiner.manager': req.user.id,
  });
  const captain = await MerchantUser.findById(req.body.captain).lean();

  if (!captain) throw new APIError('captain does not exist');

  for (const box of data) {
    if (box.status !== 'delivered')
      throw new APIError(`order ${box.orderId} is ${box.status}`);
    if (box.otp !== req.body.otp && !req.user.id.equals(captain.id))
      throw new APIError(`Invalid otp for ${box.orderId}`);
  }

  await GoldBox.updateMany(
    { _id: req.body.ids },
    {
      otp: '',
      'refiner.captain': captain.id,
      assignedAt: new Date(),
      status: 'assigned',
    }
  );

  await VerifiedGold.updateMany(
    {
      _id: data.map((box) => box.items).flat(),
    },
    {
      'refiner.captain': captain.id,
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

export const getRefinedOrders = async (req, res) => {
  const data = await RefinedGold.find({
    manager: req.user.id,
    status: req.query.status === 'checked' ? 'checked' : 'submitted',
  }).lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      refinedAt: item.refinedAt,
      checkedAt: item.checkedAt ?? '',
      hasDifference:
        calculateDiff(item.weight === item.beforeRefining.weight) > 3,
      status: item.status,
    }))
  );
};

export const getRefinedOrderById = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    manager: req.user.id,
  });

  if (!data) throw new APIError('bad request');

  const items = await Gold.find({
    refinedGold: data.id,
  });

  res.json({
    id: data.id,
    orderId: data.orderId,
    receivedWeight: data.weight,
    barCount: items.filter((item) => item.type === 'bar').length,
    ballCount: items.filter((item) => item.type === 'ball').length,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
    })),
    status: data.status,
  });
};

export const checkRefinedOrder = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    manager: req.user.id,
  });

  if (!data) throw new APIError('bad request');

  const ops = [];

  for (const item of req.body.items) {
    ops.push({
      updateOne: {
        filter: { id: item.id },
        update: {
          weight: item.weight,
          purity: item.purity,
          'manager.weight': item.weight,
          'manager.purity': item.purity,
          checkedAt: new Date(),
          status: 'checked',
        },
      },
    });
  }

  data.checkedAt = new Date();
  data.status = 'checked';

  await Gold.bulkWrite(ops);
  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getBars = async (req, res) => {
  const data = await Gold.find({
    'manager.id': req.user.id,
    type: 'bar',
    status: 'checked',
  })
    .select('id weight status')
    .lean()
    .transform((docs) =>
      docs.map((doc) => ({
        id: doc.id,
        weight: doc.weight,
        status: doc.status,
      }))
    );

  res.json(data);
};

export const packBars = async (req, res) => {
  const data = await Gold.find({ id: req.body.ids.split(',') }).lean();

  for (const item of data) {
    if (item.status !== 'checked')
      throw new APIError(`Bar ${item.id} is ${item.status}`);
  }

  const merchant = await Merchant.findById(process.env.MERCHANT_ID);
  const manager = await MerchantUser.findOne({
    role: 'manager',
    merchant: merchant?.id,
  });

  if (!merchant) throw new APIError('merchant not found');
  if (!manager) throw new APIError('manager ot found');

  const [err, shipment] = await createShipment({
    user: {
      fullName: manager.fullName,
      mobile: manager.mobile,
    },
    address: merchant.address,
    total: 0,
    netWeight: roundValue(req.body.weight * 1000, 3),
  });

  if (err) {
    logger.error(err);
    throw new APIError(
      'Unable to upload order due to shipment server issue, try again later',
      APIError.SHIPMENT_SERVER_ERROR
    );
  }

  if (shipment.status === 'false') {
    logger.error(shipment.errorInfo);
    throw new APIError(
      'Invalid request data',
      APIError.SHIPMENT_INVALID_REQUEST
    );
  }

  const ids = data.map((item) => item.id);
  const qrCode = generateQrCode();

  const box = new GoldBox({
    qrCode,
    orderId: generateOrderId(),
    itemType: 'gold',
    docketNo: shipment.data.docket_number,
    brnNo: shipment.data.brn,
    trackingUrl: `${process.env.SEQUEL_API_URL}/track/${data.docketNo}`,
    estimatedDeliveryDate: dayjs(
      shipment.data.estiimated_delivery,
      'DD-MM-YYYY'
    ).toDate(),
    refiner: {
      merchant: req.user.merchant,
      manager: req.user.id,
      weight: roundValue(req.body.weight * 1000, 3),
      weightScaleImage: req.body.image,
    },
    custodian: {
      merchant: merchant.id,
      manager: manager.id,
    },
    items: ids,
    packedAt: new Date(),
    status: 'packed',
  });

  await box.save();
  await Gold.updateMany(
    {
      _id: ids,
    },
    {
      box: box.id,
      'custodian.manager': manager.id,
      status: 'ready',
    }
  );

  res.status(201).json({
    qrCode,
  });
};

export const shipBox = async (req, res) => {
  const data = await GoldBox.findById({
    _id: req.params.id,
    'refiner.manager': req.user.id,
  });

  if (!data)
    throw new APIError('box does not exist', APIError.RESOURCE_NOT_FOUND, 404);
  if (data.status !== 'packed') throw new APIError('bad Request');

  data.refiner.agentName = req.body.agentName;
  data.refiner.agentImage = req.body.agentImage;
  data.refiner.agentDocument = req.body.agentDocument;

  data.shippedAt = new Date();
  data.status = 'shipped';

  await data.save();

  res.status(201).json({
    agentName: data.agentName,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
  });
};

export const getRefinerReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const captains = req.query.captains;
  const download = req.query.download === 'true';

  const query = GoldBox.find({
    'refiner.manager': req.user.id,
    ...parseDateFilter(req.query.from, req.query.to),
  })
    .populate('refiner.captain')
    .select('orderId refiner createdAt status');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (captains) query.where({ 'refiner.captain': captains.split(',') });

  if (req.query.status) {
    const status = req.query.status.split(',');
    query.where({ status });
  }

  const data = await query.lean();

  if (download) {
    const pdf = PDF.generateTable({
      title: 'Refiner Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Captain',
          property: 'captain',
          width: 100,
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
        captain: item.refiner.captain?.fullName ?? '-',
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
        data: array[1].map((item) => ({
          id: item.id,
          orderId: item.orderId,
          captainName: item.refiner.captain?.fullName ?? '',
          createdAt: item.createdAt,
          status: item.status,
        })),
      }))
    )
  );
};

// Custodian
export const getCustodianOverview = async (req, res) => {
  const [toBeReceived, toBeChecked] = await Promise.all([
    GoldBox.countDocuments({
      itemType: 'gold',
      'custodian.manager': req.user.id,
      status: 'shipped',
    }),
    GoldBox.countDocuments({
      itemType: 'gold',
      'custodian.manager': req.user.id,
      status: 'delivered',
    }),
  ]);

  res.json({
    toBeReceived,
    toBeChecked,
    reports: toBeReceived + toBeChecked,
  });
};

export const getCustodianOrders = async (req, res) => {
  const { offset, limit, q, from, to, status } = req.query;

  const query = GoldBox.find({
    itemType: 'gold',
    status,
    'custodian.manager': req.user.id,
    ...parseDateFilter(from, to),
  }).populate('refiner.merchant');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (q) query.where({ brnNo: new RegExp(q, 'i') });

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      docketNo: item.docketNo,
      brnNo: item.brnNo,
      refiner: item.refiner.merchant.name,
      area: 'Mahanagar',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      logistic: 'Sequel',
      pickedDate: item.shippedAt,
      estimatedDeliveryDate: item.estimatedDeliveryDate,
      receivedDate: item.deliveredAt ?? '',
    }))
  );
};

export const getCustodianOrderById = async (req, res) => {
  const isObjectId = mongoose.isValidObjectId(req.params.id);
  const data = await GoldBox.findOne({
    [isObjectId ? '_id' : 'qrCode']: req.params.id,
    itemType: 'gold',
    'custodian.manager': req.user.id,
  }).lean({ getters: true });

  const items = await Gold.find({ _id: data.items })
    .lean()
    .select('id weight purity captain manager custodian')
    .transform((docs) =>
      docs.map((doc) => ({
        id: doc.id,
        weight: doc.custodian.weight,
        purity: doc.custodian.purity,
        manager: doc.manager,
        custodian: doc.custodian,
        status: doc.status,
      }))
    );

  if (!data) throw new APIError('box does not exist');

  const receivedWeight = roundValue(
    getArrayFieldSum(items, 'manager.weight'),
    3
  );
  const enteredWeight =
    roundValue(getArrayFieldSum(items, 'custodian.weight'), 3) || 0;

  res.json({
    id: data.id,
    qrCode: data.qrCode,
    orderId: data.orderId,
    docketNo: data.docketNo,
    brnNo: data.brnNo,
    agentName: data.refiner.agentName ?? '',
    agentImage: data.refiner.agentImage ?? '',
    agentDocument: data.refiner.agentDocument ?? '',
    items: items.map((item) => ({
      id: item.id,
      weight: item.weight ?? 0,
      purity: item.purity ?? 0,
      weightScaleImage: getS3Url(item.custodian?.weightScaleImage) ?? '',
      purityScaleImage: getS3Url(item.custodian?.purityScaleImage) ?? '',
    })),
    receivedWeight,
    enteredWeight,
    differenceWeight: roundValue(receivedWeight - enteredWeight, 3),
    sealedAt: data.packedAt,
  });
};

export const receiveCustodianOrder = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'custodian.manager': req.user.id,
    itemType: 'gold',
  });

  if (!data) throw new APIError('order does not exist');

  data.custodian.agentName = req.body.agentName;
  data.custodian.agentImage = req.body.agentImage;
  data.custodian.agentDocument = req.body.agentDocument;
  data.custodian.packageImage = req.body.packageImage;

  data.deliveredAt = new Date();
  data.status = 'delivered';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const scanAndCheck = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'custodian.manager': req.user.id,
    itemType: 'gold',
  });

  if (!data) throw new APIError('order does not exist');
  if (data.qrCode !== req.body.qrCode) throw new APIError('Invalid qr code');

  data.custodian.openingVideo = req.body.openingVideo;

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const checkBar = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'custodian.manager': req.user.id,
    itemType: 'gold',
  });

  const bar = await Gold.findOne({
    id: req.body.id,
  });

  if (!data) throw new APIError('order does not exist');
  if (!bar) throw new APIError('bar does not exist');
  if (bar.status !== 'ready') throw new APIError('bad request');

  bar.weight = req.body.weight;
  bar.purity = req.body.purity;
  bar.custodian.weight = req.body.weight;
  bar.custodian.purity = req.body.purity;
  bar.custodian.weightScaleImage = req.body.weightScaleImage;
  bar.custodian.purityScaleImage = req.body.purityScaleImage;

  await bar.save();

  res.json({
    message: 'success',
  });
};

export const submitCustodianOrder = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'custodian.manager': req.user.id,
    itemType: 'gold',
  });

  if (!data) throw new APIError('order does not exist');
  if (data.status !== 'delivered') throw new APIError('bad request');

  if (req.body.raiseDispute) {
  }

  data.checkedAt = new Date();
  data.status = 'checked';

  await data.save();
  await Gold.updateMany({ _id: data.items }, { status: 'completed' });

  res.status(201).json({
    message: 'success',
  });
};

export const getCustodianReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const download = req.query.download === 'true';

  const query = GoldBox.find({
    itemType: 'gold',
    'custodian.manager': req.user.id,
    ...parseDateFilter(req.query.from, req.query.to),
  }).populate('refiner.merchant');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  if (req.query.status) {
    const status = req.query.status.split(',');
    query.where({ status });
  }

  const data = await query.lean();

  if (download) {
    const pdf = PDF.generateTable({
      title: 'Custodian Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Refiner',
          property: 'refiner',
          width: 120,
        },
        {
          label: 'Received Date',
          property: 'receivedAt',
          width: 100,
        },
        {
          label: 'status',
          property: 'status',
          width: 80,
        },
      ],
      data: data.map((item) => ({
        orderId: item.orderId,
        refiner: item.refiner.merchant?.name,
        receivedAt: dayjs(item.deliveredAt).format('DD/MM/YYYY') ?? '-',
        status: item.status === 'delivered' ? 'received' : 'checked',
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

  res.json({
    barCount: 0,
    weight: 0,
    data: orderBy(
      Object.entries(groupBy(data, 'status')).map((array) => ({
        status: array[0],
        data: array[1].map((item) => ({
          id: item.id,
          orderId: item.orderId,
          docketNo: item.docketNo,
          brnNo: item.brnNo,
          refiner: item.refiner.merchant?.name,
          area: 'Mahanagar',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          logistic: 'Sequel',
          pickedDate: item.shippedAt,
          estimatedDeliveryDate: item.estimatedDeliveryDate,
          receivedDate: item.deliveredAt ?? '',
        })),
      })),
      function (item) {
        if (item.status === 'delivered') return 1;
        return 2;
      },
      'asc'
    ),
  });
};
