import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import groupBy from 'lodash/groupBy.js';
import SecurityBag from '../../models/securityBag.js';
import Style from '../../models/style.js';
import Vehicle from '../../models/vehicle.js';
import { getCalculation } from '../../services/application.js';
import { getGoldPrice } from '../../services/ecom.js';
import { sendOTP } from '../../services/sms.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import {
  generateOtp,
  generateQrCode,
  parseDateFilter,
} from '../../utils/util.js';
import VerifiedGold from '../../models/verifiedGold.js';
import SecurityGuard from '../../models/securityGuard.js';
import Appointment from '../../models/appointment.js';
import * as PDF from '../../services/pdf.js';

export const getOverview = async (req, res) => {
  const [toBeVerified, toBeSubmitted] = await Promise.all([
    VerifiedGold.countDocuments({
      'captain.id': req.user.id,
      status: ['assigned', 'started', 'reached', 'melted'],
    }),
    VerifiedGold.countDocuments({
      'captain.id': req.user.id,
      status: 'verified',
    }),
  ]);

  res.json({
    toBeVerified,
    toBeSubmitted,
    reports: toBeVerified + toBeSubmitted,
  });
};

export const getVehicles = async (req, res) => {
  const data = await Vehicle.find({
    merchant: req.user.merchant,
    status: 'available',
    deleted: false,
  });
  res.json(data);
};

export const getSecurityGuards = async (req, res) => {
  const filter = {
    merchant: req.user.merchant,
  };

  if (req.query.q) {
    filter['fullName'] = new RegExp(req.query.q, 'gi');
  }

  const data = await SecurityGuard.find(filter).select('fullName');

  res.json(data);
};

export const createSecurityGuard = async (req, res) => {
  const data = await SecurityGuard.create({
    fullName: req.body.fullName,
    merchant: req.user.merchant,
    addedBy: req.user.id,
  });

  res.status(201).json(data);
};

export const getStyles = async (req, res) => {
  const data = await Style.find().lean();
  res.json(data);
};

export const getRequests = async (req, res) => {
  const { offset, limit, status, from, to } = req.query;
  const query = VerifiedGold.find({
    'captain.id': req.user.id,
    ...parseDateFilter(from, to),
  }).populate('appointment');

  if (offset) query.skip(parseInt(offset));
  if (limit) query.limit(parseInt(limit));

  switch (status) {
    case 'toBeVerified':
      query.where({
        status: { $in: ['assigned', 'started', 'reached', 'melted'] },
      });
      break;
    case 'toBeSubmitted':
      query.where({
        status: 'verified',
      });
      break;
  }

  query.transform((data) =>
    data.map((item) => ({
      id: item._id ?? item.id,
      orderId: item.orderId,
      distance: 8.3,
      scheduledAt: item.appointment.scheduledDate || '',
      verifiedAt: item.verifiedAt || '',
      createdAt: item.createdAt,
      status: item.status,
    }))
  );

  const data = await query.lean();

  res.json(data);
};

export const getRequestById = async (req, res) => {
  const data = await VerifiedGold.findOne({ _id: req.params.id })
    .populate({
      path: 'appointment',
      populate: ['user', 'address'],
    })
    .populate('securityGuards')
    .populate('vehicle')
    .populate('items.styles.style')
    .lean({ getters: true });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data.id,
    orderId: data.orderId,
    name: data.appointment.user.fullName,
    location: data.appointment.address?.location.coordinates,
    address: data.appointment.address,
    mobile: data.appointment.user.mobile,
    appointedDate: data.appointment.scheduledDate,
    vehicleNumber: data.vehicle?.number ?? '',
    securityGuards: data.securityGuards ?? [],
    items: data.items,
    createdAt: data.createdAt,
    status: data.status,
  });
};

export const startVerifying = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  const vehicle = await Vehicle.findOne({
    _id: req.body.vehicle,
    merchant: req.user.merchant,
  }).lean();

  const securityGuards = await SecurityGuard.find({
    _id: req.body.securityGuards,
    merchant: req.user.merchant,
  }).lean();

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  // if (data.verifier.status !== 'assigned') throw new APIError('Bad Request');
  if (!vehicle) throw new APIError('vehicle does not exist');
  if (!securityGuards.length) throw new APIError('security guard is required');

  data.vehicle = vehicle.id;
  data.securityGuards = securityGuards.map((e) => e.id);
  data.events.push({
    name: 'started',
    location: req.body.location,
    createdAt: new Date(),
  });
  data.startedAt = new Date();
  data.status = 'started';

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const reachedLocation = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  }).populate({
    path: 'appointment',
    populate: 'user',
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  // if (data.verifier.status !== 'started') throw new APIError('Bad Request');

  const otp = generateOtp();

  data.otp = otp;

  sendOTP(data.appointment.user.mobile, data.otp);

  data.events.push({
    name: 'reached',
    location: req.body.location,
    createdAt: new Date(),
  });
  data.reachedAt = new Date();
  data.status = 'reached';

  await data.save();

  res.status(201).json({
    otp: data.otp,
  });
};

export const getItems = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  })
    .populate('items.styles.style')
    .lean({ getters: true });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  //if (data.status !== 'reached') throw new APIError('bad Request');

  res.json(data.items);
};

const updateWeights = (data) => {
  let grossWeight = 0;
  let netWeight = 0;
  let purity = 0;
  let totalStyleAmount = 0;

  for (const item of data.items) {
    let styleWeight = 0;
    let styleAmount = 0;
    for (const style of item.styles ?? []) {
      styleWeight += style.weight;
      styleAmount += style.weight * style.rate;
    }
    item.netWeight = roundValue(item.grossWeight - styleWeight, 3);
    item.netPurity = item.grossPurity;
    item.styleAmount = roundValue(styleAmount);

    grossWeight += item.grossWeight;
    netWeight += item.netWeight;
    purity += item.netPurity;
    totalStyleAmount += item.styleAmount;
  }

  data.beforeMelting = {
    grossWeight: roundValue(grossWeight, 3),
    netWeight: roundValue(netWeight, 3),
    grossPurity: roundValue(purity / data.items.length, 1),
    netPurity: roundValue(purity / data.items.length, 1),
    styleAmount: roundValue(totalStyleAmount),
  };
};

export const addItem = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  // if (data.verifier.status !== 'reached') throw new APIError('bad Request');

  data.items.push({
    name: req.body.name,
    image: req.body.image,
    grossWeight: req.body.grossWeight,
    grossPurity: req.body.grossPurity,
    styles: req.body.styles,
  });

  updateWeights(data);

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const updateItem = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  // if (data.verifier.status !== 'reached') throw new APIError('Bad Request');

  const item = data.items.find((item) => item.id.equals(req.params.itemId));
  if (!item) throw new APIError('item does not exist');

  Object.assign(item, req.body);

  updateWeights(data);

  await data.save();

  res.json({
    message: 'success',
  });
};

export const deleteItem = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  // if (data.verifier.status !== 'reached') throw new APIError('Bad Request');

  data.items = data.items.filter((item) => !item.id.equals(req.params.itemId));

  updateWeights(data);

  await data.save();

  res.json({
    message: 'success',
  });
};

export const getRequestOverview = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  })
    .populate('items.styles.style')
    .lean({ getters: true });

  const gold = await getGoldPrice();

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  // if (data.verifier.status !== 'reached') throw new APIError('Bad Request');

  const approximateWeight = data.beforeMelting.netWeight;
  const approximateAmount = roundValue(
    approximateWeight * gold.sellPrice + data.beforeMelting.styleAmount
  );
  const netWeight = data.captain?.netWeight ?? null;
  const netPurity = data.captain?.netPurity ?? null;
  const sellAmount =
    roundValue(netWeight * gold.sellPrice * (netPurity / 100)) || null;

  res.json({
    id: data.id,
    orderId: data.orderId,
    items: data.items,
    approximateWeight,
    approximateAmount,
    netWeight,
    netPurity,
    sellAmount,
    uploadWeight: netWeight,
  });

  await VerifiedGold.updateOne(
    { _id: req.params.id },
    { sellRate: gold.sellPrice }
  );
};

export const sendVerificationCode = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  }).populate({
    path: 'appointment',
    populate: 'user',
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'reached') throw new APIError('Bad Request');

  const otp = generateOtp();

  data.otp = otp;

  await sendOTP(data.appointment.user.mobile, otp);

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const verifyOTP = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const isValidOTP = data.otp === req.body.otp;

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const token = jwt.sign(
    {
      id: data.id,
      type: 'melting',
    },
    process.env.SECRET,
    {
      expiresIn: '3h',
    }
  );

  res.status(201).json({
    token,
  });
};

export const meltGold = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });
  const gold = await getGoldPrice();
  const tax = await getCalculation('declaration_tax');

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'reached') throw new APIError('bad Request');

  const netWeight = req.body.netWeight;
  const netPurity = req.body.purity;
  const declarationWeight = roundValue(netWeight * (tax / 100), 3);

  data.captain.netWeight = netWeight;
  data.captain.netPurity = netPurity;
  data.captain.weightScaleImage = req.body.weightScaleImage;
  data.captain.purityScaleImage = req.body.purityScaleImage;
  data.events.push({
    name: 'melted',
    location: req.body.location,
    createdAt: new Date(),
  });
  data.meltedAt = new Date();
  data.status = 'melted';

  await data.save();

  res.status(201).json({
    id: data.id,
    orderId: data.orderId,
    netWeight,
    netPurity,
    sellAmount: roundValue(netWeight * gold.sellPrice * (netPurity / 100)),
    uploadWeight: netWeight,
    declarationPercentage: tax,
    declarationWeight,
    uploadWeightAfterDeclaration: roundValue(netWeight - declarationWeight, 3),
  });
};

export const uploadGold = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  }).populate({
    path: 'appointment',
    populate: 'user',
  });

  const tax = await getCalculation('declaration_tax');

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'melted') throw new APIError('bad Request');

  const otp = generateOtp();

  data.otp = otp;
  data.type = 'upload';
  data.isDeclared = req.body.isDeclared;

  if (data.isDeclared) {
    data.declarationTax = tax;
    data.declarationWeight = roundValue(
      data.captain.netWeight * (tax / 100),
      3
    );
  }

  await sendOTP(data.appointment.user.mobile, otp);

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const sellGold = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  }).populate({
    path: 'appointment',
    populate: 'user',
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'melted') throw new APIError('bad Request');

  const otp = generateOtp();

  data.otp = otp;
  data.type = 'sell';

  await sendOTP(data.appointment.user.mobile, otp);

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const pickItems = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });
  const bag = await SecurityBag.findOne({ serialNumber: req.body.qrCode });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'melted') throw new APIError('bad Request');

  if (data.otp !== req.body.otp)
    throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  if (!bag) throw new APIError('bag does not exist');
  if (bag.status !== 'available') throw new APIError('bag is already used');

  const qrCode = generateQrCode();

  data.qrCode = qrCode;
  data.captain.qrCode = qrCode;
  data.captain.bag = bag.id;
  data.captain.bagWeight = req.body.weight;
  data.captain.bagWeightScaleImage = req.body.weightScaleImage;
  data.captain.bagSealingVideo = req.body.sealingVideo;

  data.events.push({
    name: 'verified',
    location: req.body.location,
    createdAt: new Date(),
  });

  data.verifiedAt = new Date();
  data.status = 'verified';

  bag.status = 'used';

  if (data.manager.id.equals(req.user.id)) {
    data.events.push({
      name: 'submitted',
      location: req.body.location,
      createdAt: new Date(),
    });

    data.submittedAt = new Date();
    data.status = 'submitted';
  }

  await data.save();
  await bag.save();

  await Appointment.updateOne(
    { _id: data.appointment },
    {
      status: 'completed',
    }
  );

  res.status(201).json({
    qrCode,
  });
};

export const reject = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.otp !== req.body.otp)
    throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const cancelledStage =
    data.status === 'melted' ? 'after_melting' : 'before_melting';

  data.events.push({
    name: 'cancelled',
    location: req.body.location,
    createdAt: new Date(),
  });

  data.cancelledAt = new Date();
  data.status = 'cancelled';

  await Appointment.updateOne(
    { _id: data.appointment },
    { status: 'cancelled', cancelledAt: new Date(), cancelledStage }
  );

  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const notifyManager = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  }).populate('manager.id');

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (data.status !== 'verified') throw new APIError('bad request');

  const otp = generateOtp();

  data.otp = otp;

  await sendOTP(data.manager.id.mobile, otp);
  await data.save();

  res.status(201).json({
    message: 'success',
  });
};

export const handOverRequest = async (req, res) => {
  const data = await VerifiedGold.findOne({
    _id: req.params.id,
    'captain.id': req.user.id,
  });

  const isValidOTP = data?.otp === req.body.otp;

  if (!data)
    throw new APIError(
      'request does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (data.status !== 'verified') throw new APIError('bad request');
  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  data.events.push({
    name: 'submitted',
    location: req.body.location,
    createdAt: new Date(),
  });

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

  const query = VerifiedGold.find({
    'captain.id': req.user.id,
  }).populate('appointment');

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
      title: 'Verifier Reports',
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
          label: 'Appointment Date',
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
        assignedAt: dayjs(item.assignedAt).format('DD/MM/YYYY'),
        scheduledDate: dayjs(item.appointment.scheduledDate).format(
          'DD/MM/YYYY HH/mm'
        ),
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
        scheduledDate: item.appointment.scheduledDate,
        status: item.status,
      })),
    }))
  );
};
