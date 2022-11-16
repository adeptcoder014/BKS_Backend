import orderBy from 'lodash/orderBy.js';
import groupBy from 'lodash/groupBy.js';
import dayjs from 'dayjs';
import RejectReason from '../../models/rejectReason.js';
import ReturnOrder from '../../models/returnOrder.js';
import APIError from '../../utils/error.js';
import { sendOTP } from '../../services/sms.js';
import cryptoRandomString from 'crypto-random-string';
import { parseDateFilter } from '../../utils/util.js';
import * as PDF from '../../services/pdf.js';

export const getOverview = async (req, res) => {
  const [toBeChecked, toBeSent] = await Promise.all([
    ReturnOrder.countDocuments({ captain: req.user.id, status: 'assigned' }),
    ReturnOrder.countDocuments({
      captain: req.user.id,
      status: 'checked',
      isHandedOverToManager: false,
    }),
  ]);

  res.json({
    toBeChecked,
    toBeSent,
    reports: toBeChecked + toBeSent,
  });
};

export const getOrders = async (req, res) => {
  const { offset, limit, status, from, to } = req.query;

  const query = ReturnOrder.find({
    captain: req.user.id,
    ...parseDateFilter(from, to),
  })
    .select({
      orderId: 1,
      captain: 1,
      estimatedDeliveryDate: 1,
      status: 1,
      receivedAt: 1,
      assignedAt: 1,
      checkedAt: 1,
      createdAt: 1,
    })
    .transform((data) =>
      data.map((values) => ({
        id: values._id,
        orderId: values.orderId,
        estimatedDeliveryDate: values.estimatedDeliveryDate || '',
        createdAt: values.createdAt,
        receivedAt: values.receivedAt || '',
        assignedAt: values.assignedAt || '',
        checkedAt: values.checkedAt || '',
        status: values.status,
      }))
    );

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));

  switch (status) {
    case 'assigned':
      query.where({ status });
      break;
    case 'checked':
      query.where({ status, isHandedOverToManager: false });
      break;
    default:
      query.or([
        { status: 'assigned' },
        { status: 'checked', isHandedOverToManager: false },
      ]);
  }

  const data = await query.lean({ getters: true });

  res.json(data);
};

export const getOrderById = async (req, res) => {
  const order = await ReturnOrder.findOne({
    _id: req.params.id,
    captain: req.user.id,
  })
    .populate('manager')
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
    docketNo: order.docketNo,
    brnNo: order.brnNo,
    estimatedDeliveryDate: order.estimatedDeliveryDate || '',
    managerName: order.manager.fullName,
    items: order.items.map((item) => ({
      id: item.product?._id,
      title: item.title,
      image: item.image,
      quantity: item.quantity,
      checkingVideo: item.captain?.checkingVideo || '',
      rejectedReason: item.captain?.rejectedReason || '',
      status: item.captain?.status || 'pending',
    })),
    isHandedOver: order.isHandedOverToManager || false,
    createdAt: order.createdAt,
    receivedAt: order.receivedAt || null,
    assignedAt: order.assignedAt || null,
    checkedAt: order.checkedAt || null,
    handedOverAt: order.handedOverAt || null,
    status: order.status,
  });
};

export const checkOrderItem = async (req, res) => {
  const order = await ReturnOrder.findOne({
    captain: req.user.id,
    _id: req.params.id,
  });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'assigned')
    throw new APIError('order is already checked');

  const item = order.items.find((item) =>
    item.product.equals(req.params.itemId)
  );
  if (!item) throw new APIError('item not found');

  item.checkingVideo = req.body.checkingVideo;

  switch (req.body.status) {
    case 'accepted':
      item.captain.status = 'accepted';
      break;
    case 'rejected':
      item.captain.status = 'rejected';
      item.captain.rejectedReason = req.body.rejectedReason;
      break;
  }

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const checkOrder = async (req, res) => {
  const order = await ReturnOrder.findOne({
    captain: req.user.id,
    _id: req.params.id,
  });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'assigned')
    throw new APIError('order is already handed over to manager');

  order.openingVideo = req.body.openingVideo;

  for (const item of order.items) {
    if (item.captain?.status === 'pending') {
      throw new APIError('please check all the items');
    }
  }

  order.checkedAt = new Date();
  order.status = 'checked';

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const notifyManager = async (req, res) => {
  const order = await ReturnOrder.findOne({
    captain: req.user.id,
    _id: req.params.id,
  }).populate('manager');

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (order.status !== 'checked' || order.isHandedOverToManager)
    throw new APIError('order is already handed over to manager');

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  order.otp = otp;

  sendOTP(order.manager.mobile, otp);

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const handOverOrder = async (req, res) => {
  const order = await ReturnOrder.findOne({
    captain: req.user.id,
    _id: req.params.id,
  });

  const isValidOTP = order?.otp === req.body.otp;

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (order.status !== 'checked' || order.isHandedOverToManager)
    throw new APIError('order is already handed over to manager');
  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  order.isHandedOverToManager = true;
  order.handedOverAt = new Date();

  await order.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getRejectReasons = async (req, res) => {
  const data = await RejectReason.find().lean();
  res.json(data);
};

export const getReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const download = req.query.download;

  const query = ReturnOrder.find({
    captain: req.user.id,
    ...parseDateFilter(req.query.from, req.query.to),
  }).select({
    orderId: 1,
    docketNo: 1,
    isHandedOverToManager: 1,
    createdAt: 1,
    receivedAt: 1,
    assignedAt: 1,
    checkedAt: 1,
    completedAt: 1,
    status: 1,
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
      title: 'Return Reports',
      headers: [
        {
          label: 'Order ID',
          property: 'orderId',
          width: 80,
        },
        {
          label: 'Assigned Date',
          property: 'assignedAt',
          width: 100,
        },
        {
          label: 'Checked Date',
          property: 'checkedAt',
          width: 80,
        },
        {
          label: 'Handed Over',
          property: 'isHandedOver',
          width: 80,
        },
      ],
      data: data.map((item) => ({
        orderId: item.orderId,
        assignedAt: dayjs(item.createdAt).format('DD/MM/YYYY'),
        checkedAt: item.checkedAt
          ? dayjs(item.checkedAt).format('DD/MM/YYYY')
          : '-',
        isHandedOver: item.isHandedOverToManager ? 'Yes' : 'No',
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
        if (item.status === 'assigned') return 1;
        return 2;
      },
      'asc'
    )
  );
};
