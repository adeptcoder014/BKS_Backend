import groupBy from 'lodash/groupBy.js';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import VerifiedGold from '../../models/verifiedGold.js';
import RefinedGold from '../../models/refinedGold.js';
import APIError from '../../utils/error.js';
import {
  calculateDiff,
  generateOrderId,
  generateOtp,
  getArrayFieldSum,
  parseDateFilter,
} from '../../utils/util.js';
import { sendOTP } from '../../services/sms.js';
import GoldBox from '../../models/goldBox.js';
import roundValue from '../../utils/roundValue.js';
import Gold from '../../models/gold.js';
import * as PDF from '../../services/pdf.js';

export const getOverview = async (req, res) => {
  const [toBeCheck, toBeRefined, toBeUpload, toBeIssue, toBeSubmit] =
    await Promise.all([
      GoldBox.countDocuments({
        'refiner.captain': req.user.id,
        status: 'assigned',
      }),
      VerifiedGold.countDocuments({
        'refiner.captain': req.user.id,
        status: 'refined',
      }),
      RefinedGold.countDocuments({
        captain: req.user.id,
        status: 'started',
      }),
      0,
      RefinedGold.countDocuments({
        captain: req.user.id,
        status: 'refined',
      }),
    ]);

  res.json({
    toBeCheck,
    toBeRefined,
    toBeUpload,
    toBeIssue,
    toBeSubmit,
    reports: 0,
  });
};

export const getBags = async (req, res) => {
  const { offset, limit, from, to, status } = req.query;

  const query = GoldBox.find({
    'refiner.captain': req.user.id,
    ...parseDateFilter(from, to),
    status: 'assigned',
  });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      assignedAt: item.assignedAt,
      createdAt: item.createdAt,
      status: item.status,
    }))
  );
};

export const getBagById = async (req, res) => {
  const isObjectId = mongoose.isValidObjectId(req.params.id);

  const data = await GoldBox.findOne({
    [isObjectId ? '_id' : 'qrCode']: req.params.id,
    'refiner.captain': req.user.id,
  }).lean({ getters: true });

  if (!data) throw new APIError('box does not exist');

  res.json({
    id: data.id,
    orderId: data.orderId,
    docketNo: data.docketNo,
    brnNo: data.brnNo,
    agentName: data.refiner.agentName,
    agentImage: data.refiner.agentImage,
    agentDocument: data.refiner.agentDocument,
    status: data.status,
  });
};

export const getBagOverview = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.captain': req.user.id,
  }).populate('items');

  if (!data) throw new APIError('box does not exist');

  let vWeight = 0,
    rWeight = 0,
    vPurity = 0,
    rPurity = 0;

  for (const item of data.items) {
    vWeight += item.manager.netWeight || item.captain.netWeight;
    vPurity += item.manager.netPurity || item.captain.netPurity;

    rWeight += item.refiner.netWeight;
    rPurity += item.refiner.netPurity;
  }

  const verifier = {
    weight: roundValue(vWeight, 3),
    purity: roundValue(vPurity / data.items.length, 0),
    itemCount: data.verifier.itemCount,
  };

  const refiner = {
    weight: roundValue(rWeight, 3),
    purity: roundValue(rPurity / data.items.length, 0),
    itemCount: data.refiner.itemCount,
  };

  verifier.fineGold = roundValue(verifier.weight * (verifier.purity / 100), 3);
  refiner.fineGold = roundValue(refiner.weight * (refiner.purity / 100), 3);

  res.json({
    verifier,
    refiner,
    differenceWeight: roundValue(verifier.fineGold - refiner.fineGold, 3),
  });
};

export const getBagWeightDiff = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.captain': req.user.id,
  }).lean();

  if (!data) throw new APIError('bag does not exist');

  const diff = calculateDiff(data.verifier.weight, req.query.weight);

  res.json({
    difference: diff,
  });
};

export const checkBag = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.captain': req.user.id,
  });

  if (!data) throw new APIError('bag does not exist');
  if (data.status !== 'assigned') throw new APIError('bad request');

  if (req.body.weight) {
    data.refiner.weight = req.body.weight;
    data.refiner.weightScaleImage = req.body.image;
  }

  if (req.body.itemCount) {
    data.refiner.itemCount = req.body.itemCount;
    data.refiner.openingVideo = req.body.video;
  }

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getBagItemDiff = async (req, res) => {
  const data = await VerifiedGold.findOne({
    qrCode: req.params.qrCode,
  }).lean();

  if (!data) throw new APIError('item does not exist');

  const weightDiff = calculateDiff(
    data.manager.netWeight || data.captain.netWeight,
    req.query.weight
  );
  const purityDiff = calculateDiff(
    data.manager.netPurity || data.captain.netPurity,
    req.query.purity
  );

  res.json({
    weightDifference: weightDiff,
    purityDifference: purityDiff,
  });
};

export const checkBagItem = async (req, res) => {
  const data = await VerifiedGold.findOne({
    qrCode: req.params.qrCode,
  });

  if (!data) throw new APIError('item does not exist');

  data.refiner.openingVideo = req.body.openingVideo;
  data.refiner.purityCheckingVideo = req.body.purityCheckingVideo;
  data.refiner.weightScaleImage = req.body.weightScaleImage;
  data.refiner.purityScaleImage = req.body.purityScaleImage;

  data.refiner.netWeight = req.body.weight;
  data.refiner.netPurity = req.body.purity;

  data.status = 'refined';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const accept = async (req, res) => {
  const data = await GoldBox.findOne({
    _id: req.params.id,
    'refiner.captain': req.user.id,
  });

  if (!data) throw new APIError('bag does not exist');

  data.checkedAt = new Date();
  data.status = 'checked';

  if (req.body.raiseDispute) {
  }

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getItem = async (req, res) => {
  const data = await VerifiedGold.findOne({
    qrCode: req.params.qrCode,
  });

  if (!data) throw new APIError('item does not exist');
  if (data.status !== 'refined') throw new APIError('item not yet checked');

  res.json({
    id: data.id,
    weight: data.refiner.netWeight,
    purity: data.refiner.netPurity,
  });
};

export const startRefining = async (req, res) => {
  const data = await VerifiedGold.find({
    _id: req.body.ids,
  }).lean();

  let weight = 0;
  let purity = 0;

  for (const item of data) {
    if (item.status !== 'refined') throw new APIError('item not yet checked');
    weight += item.refiner.netWeight;
    purity += item.refiner.netPurity;
  }

  const refinedGold = new RefinedGold({
    orderId: generateOrderId(),
    merchant: req.user.merchant,
    manager: data[0].refiner.manager,
    captain: req.user.id,
    items: data.map((e) => e.id),
    meltingVideo: req.body.meltingVideo,
    beforeRefining: {
      weight: roundValue(weight, 3),
      purity: roundValue(purity / data.length, 0),
    },
    startedAt: new Date(),
    status: 'started',
  });

  await refinedGold.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getRefinedOrders = async (req, res) => {
  const status = req.query.status === 'refined' ? 'refined' : 'started';

  const orders = await RefinedGold.find({
    captain: req.user.id,
    status,
  })
    .sort({ createdAt: -1 })
    .lean();

  const items = await Gold.find({
    refinedGold: orders.map((e) => e.id),
  });

  res.json(
    orders.map((data) => {
      const bFineGold = roundValue(
        (data.beforeRefining.weight / data.beforeRefining.purity) * 100,
        3
      );
      const aFineGold = roundValue((data.weight / data.purity) * 100, 3);

      return {
        id: data.id,
        orderId: data.orderId,
        status: data.status,
        beforeRefining: {
          weight: data.beforeRefining.weight,
          purity: data.beforeRefining.purity,
          fineGold: bFineGold,
        },
        afterRefining: {
          weight: data.weight ?? null,
          purity: data.purity ?? null,
          fineGold: aFineGold,
        },
        differenceWeight: roundValue(bFineGold - aFineGold, 3),
        barCount: items.filter((e) => e.type === 'bar').length,
        ballCount: items.filter((e) => e.type === 'ball').length,
        items: items
          .filter((e) => e.refinedGold.equals(data.id))
          .map((item) => ({
            id: item.id,
            type: item.type,
            weight: item.weight,
            purity: item.purity,
          })),
        refinedWeight: roundValue(getArrayFieldSum(items, 'weight'), 3),
        enteredWeight: data.weight,
      };
    })
  );
};

export const getRefinedOrderById = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  }).lean();
  const items = await Gold.find({
    refinedGold: data.id,
  });

  if (!data) throw new APIError('order does not exist');

  const bFineGold = roundValue(
    (data.beforeRefining.weight / data.beforeRefining.purity) * 100,
    3
  );
  const aFineGold = roundValue((data.weight / data.purity) * 100, 3);

  res.json({
    id: data.id,
    orderId: data.orderId,
    status: data.status,
    beforeRefining: {
      weight: data.beforeRefining.weight,
      purity: data.beforeRefining.purity,
      fineGold: bFineGold,
    },
    afterRefining: {
      weight: data.weight ?? null,
      purity: data.purity ?? null,
      fineGold: aFineGold,
    },
    differenceWeight: roundValue(bFineGold - aFineGold, 3),
    barCount: items.filter((e) => e.type === 'bar').length,
    ballCount: items.filter((e) => e.type === 'ball').length,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      weight: item.weight,
      purity: item.purity,
    })),
    refinedWeight: roundValue(getArrayFieldSum(items, 'weight'), 3),
    enteredWeight: data.weight,
  });
};

export const updateRefinedOrder = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
    status: 'started',
  });

  if (!data) throw new APIError('order does not exist');

  data.weight = req.body.weight;
  data.purity = roundValue((data.weight / data.beforeRefining.weight) * 100, 0);
  data.weightScaleImage = req.body.weightScaleImage;

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

const generateBarCode = async () => {
  const code = generateOrderId();

  const isExists = await Gold.exists({ id: code });
  if (isExists) return generateBarCode();

  return code;
};

export const generateItemCode = async (req, res) => {
  const code = await generateBarCode();

  res.json({ code });
};

export const addItem = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  });

  if (!data) throw new APIError('order does not exist');
  if (data.status !== 'started') throw new APIError('bad request');

  const item = new Gold({
    id: req.body.id,
    type: req.body.type,
    refinedGold: data.id,
    captain: {
      id: req.user.id,
      weight: req.body.weight,
      purity: req.body.purity,
      weightScaleImage: req.body.weightScaleImage,
      purityScaleImage: req.body.purityScaleImage,
    },
    weight: req.body.weight,
    purity: req.body.purity,
    status: 'inactive',
  });

  await item.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getItemById = async (req, res) => {
  const data = await Gold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data) throw new APIError('Invalid barcode id');

  res.json(data);
};

export const updateItem = async (req, res) => {
  const order = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  });
  const data = await Gold.findOne({
    id: req.params.itemId,
    'captain.id': req.user.id,
  });

  if (!order) throw new APIError('order does not exist');
  if (!data) throw new APIError('Invalid barcode id');
  if (order.status !== 'started') throw new APIError('bad request');

  data.captain = {
    weight: req.body.weight,
    purity: req.body.purity,
    weightScaleImage: req.body.weightScaleImage,
    purityScaleImage: req.body.purityScaleImage,
  };

  data.weight = req.body.weight;
  data.purity = req.body.purity;

  await data.save();

  res.json({
    message: 'success',
  });
};

export const deleteItem = async (req, res) => {
  await Gold.deleteOne({ id: req.params.itemId, 'captain.id': req.user.id });

  res.json({
    message: 'success',
  });
};

export const completeRefining = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  });

  if (!data) throw new Error('order does not exist');
  if (data.status !== 'started') throw new APIError('bad request');

  data.refinedAt = new Date();
  data.status = 'refined';

  await Gold.updateMany(
    { refinedGold: data.id },
    { 'manager.id': data.manager, addedAt: new Date(), status: 'added' }
  );
  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const notifyManager = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  }).populate('manager');

  if (!data) throw new APIError('order does not exist');
  if (data.status !== 'refined') throw new APIError('bad request');

  const otp = generateOtp();

  data.otp = otp;

  await sendOTP(data.manager.mobile, otp);
  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const handOver = async (req, res) => {
  const data = await RefinedGold.findOne({
    _id: req.params.id,
    captain: req.user.id,
  });
  const isValidOTP = data?.otp === req.body.otp;

  if (!data) throw new APIError('order does not exist');
  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);
  if (data.status !== 'refined') throw new APIError('bad request');

  data.otp = '';
  data.submittedAt = new Date();
  data.status = 'submitted';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const getReports = async (req, res) => {
  const offset = parseInt(req.query.offset);
  const limit = parseInt(req.query.limit);
  const download = req.query.download;

  const query = RefinedGold.find({
    captain: req.user.id,
  });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  if (req.query.from || req.query.to) {
    query.where(parseDateFilter(req.query.from, req.query.to));
  }

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
          label: 'Started Date',
          property: 'assignedAt',
          width: 100,
        },
        {
          label: 'Refined Date',
          property: 'scheduledDate',
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
        startedAt: dayjs(item.assignedAt).format('DD/MM/YYYY'),
        refinedAt: dayjs(item.appointment.scheduledDate).format('DD/MM/YYYY'),
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
    Object.entries(groupBy(data, 'status')).map((array) => ({
      status: array[0],
      data: array[1].map((item) => ({
        id: item.id,
        orderId: item.orderId,
        startedAt: item.startedAt,
        refinedAt: item.refinedAt,
        status: item.status,
      })),
    }))
  );
};
