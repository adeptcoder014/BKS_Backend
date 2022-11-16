import dayjs from 'dayjs';
import {
  Interest,
  Payment,
  SellRequest,
  Reserve,
  Product,
} from '../../models/index.js';
import { getCalculation } from '../../services/application.js';
import { getGoldPrice } from '../../services/ecom.js';
import Gateway from '../../services/gateway.js';
import sendNotification from '../../services/notification.js';
import razorpay from '../../services/razorpay.js';
import { buyGold, getUserWallet, sellGold } from '../../services/user.js';
import { MODULE, TRANSACTION_TYPE } from '../../utils/constants.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import { generateUniqueId, verifyJWT } from '../../utils/util.js';

export const getReserves = async (req, res) => {
  const data = await Reserve.find({
    status: req.query.status || ['active', 'expired'],
    user: req.user.id,
  }).lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      weight: item.weight,
      rate: item.rate,
      duration: item.duration,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      status: item.status,
    }))
  );
};

export const getReserveById = async (req, res) => {
  const data = await Reserve.findOne({ _id: req.params.id, user: req.user.id })
    .lean()
    .populate({
      path: 'product',
      populate: 'hsn',
    });

  if (!data)
    throw new APIError(
      'entry does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const tax = data.product.hsn.gst;
  const amount = roundValue(data.weight * data.rate, 2);
  const taxAmount = roundValue(amount * (tax / 100), 2);
  const totalAmount = roundValue(amount + taxAmount, 2);

  res.json({
    id: data.id,
    weight: data.weight,
    rate: data.rate,
    duration: data.duration,
    tax,
    taxAmount,
    amount,
    totalAmount,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    status: data.status,
  });
};

export const getAvailableGoldForSell = async (req, res) => {
  const payload = verifyJWT(req.query.token, process.env.SECRET);
  const product = await Product.findById(process.env.GOLD_PRODUCT_ID)
    .lean()
    .populate('hsn');
  const tax = await getCalculation('sell_gold_gst');

  const [wallet, interest] = await Promise.all([
    getUserWallet(req.user.id),
    Interest.findOne({
      type: 'reserve',
      minMonth: { $lte: req.query.duration },
      maxMonth: { $gte: req.query.duration },
    }).lean(),
  ]);

  if (!interest) throw new APIError('duration is not available');

  const savedWeight =
    (req.query.merchant
      ? wallet.data.find((item) => item.merchant.equals(req.body.merchant))
          ?.redeemable
      : wallet.redeemable) || 0;

  const availableAmount = roundValue(
    savedWeight *
      (1 - (interest.value / 100) * 2 * req.query.duration) *
      payload.sellPrice *
      (1 - tax / 100)
  );

  res.json({
    amount: availableAmount,
    interest: interest.value,
  });
};

export const createReserve = async (req, res) => {
  const payload = verifyJWT(req.body.token, process.env.SECRET);

  const [product, wallet, interest, tax] = await Promise.all([
    Product.findById(process.env.GOLD_PRODUCT_ID).populate('hsn').lean(),
    getUserWallet(req.user.id),
    Interest.findOne({
      type: 'reserve',
      minMonth: { $lte: req.body.duration },
      maxMonth: { $gte: req.body.duration },
    }).lean(),
    getCalculation('sell_gold_gst'),
  ]);

  if (!interest)
    throw new APIError(
      `Interest for ${req.body.duration} months does not exist`
    );

  const savedWeight =
    (req.body.merchant
      ? wallet.data.find((item) => item.merchant.equals(req.body.merchant))
          ?.redeemable
      : wallet.redeemable) || 0;

  const interestWeight = roundValue(
    (req.body.amount / (payload.sellPrice * (1 - tax / 100))) *
      (interest.value / 100) *
      req.body.duration,
    3
  );

  const availableAmount = roundValue(
    savedWeight *
      (1 - (interest.value / 100) * 2 * req.body.duration) *
      payload.sellPrice *
      (1 - tax / 100)
  );

  if (req.body.amount > availableAmount)
    throw new APIError(`You can only request upto ${availableAmount} rupees`);

  const totalAmount = roundValue(req.body.amount, 2);
  const taxAmount = roundValue(totalAmount * (tax / 100), 2);
  const amount = roundValue(totalAmount - taxAmount, 2);
  const weight = roundValue(amount / payload.sellPrice, 3);

  const sellData = await sellGold({
    userId: req.user.id,
    merchantId: req.body.merchant,
    productId: product.id,
    description: product.title,
    hsn: product.hsn.code,
    wallet,
    module: MODULE.SELL_RESERVE,
    sellRate: payload.sellPrice,
    weight,
    rate: payload.sellPrice,
    tax,
    taxAmount,
    amount,
    totalAmount,
  });

  const interestData = await sellGold({
    userId: req.user.id,
    merchantId: req.body.merchant,
    productId: product.id,
    description: product.title,
    hsn: product.hsn.code,
    wallet,
    module: MODULE.SELL_RESERVE,
    sellRate: payload.sellPrice,
    weight: interestWeight,
    rate: 0,
    tax: 0,
    taxAmount: 0,
    amount: 0,
    totalAmount: 0,
  });

  const request = new SellRequest({
    transactions: sellData.transactionIds,
    user: req.user.id,
    weight,
    amount: totalAmount,
    rate: payload.sellPrice,
    account: req.body.account,
    status: 'pending',
  });

  const reserve = new Reserve({
    weight,
    amount: totalAmount,
    rate: payload.sellPrice,
    interestApplied: interest.value,
    interestWeight,
    duration: req.body.duration,
    product: product.id,
    user: req.user.id,
    merchants: sellData.custodyReleases.map((item) => item.id),
    merchant: interestData.custodyReleases[0].id,
    transactions: sellData.transactionIds,
    dueDate: dayjs().add(1, 'month').toDate(),
    expiresAt: dayjs().add(req.body.duration, 'month').toDate(),
    installments: [
      {
        id: interestData.transactionIds[0],
        type: 'hold',
        weight: interestWeight,
        count: 1,
        createdAt: sellData.createdAt,
      },
    ],
    createdAt: sellData.createdAt,
    status: 'active',
  });

  await request.save();
  await reserve.save();

  res.status(201).json({
    weight,
    rate: payload.sellPrice,
    description: product.title,
    duration: reserve.duration,
    custodyReleases: [
      ...sellData.custodyReleases,
      ...interestData.custodyReleases,
    ],
    balanceWeight: interestData.balanceWeight,
    balanceWorth: interestData.balanceWorth,
  });
};

export const buyReserved = async (req, res) => {
  const [reserve, product, payload] = await Promise.all([
    Reserve.findOne({ _id: req.params.id, user: req.user.id }),
    Product.findById(process.env.GOLD_PRODUCT_ID).populate('hsn').lean(),
    getGoldPrice(),
  ]);

  if (!reserve)
    throw new APIError(
      'reserve does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (reserve.status !== 'active' || +reserve.expiresAt < Date.now())
    throw new APIError('expired');

  const tax = product.hsn.gst;
  const rate = reserve.rate;
  const weight = reserve.weight;
  const amount = roundValue(weight * rate, 2);
  const taxAmount = roundValue(amount * (tax / 100), 2);
  const totalAmount = roundValue(amount + taxAmount);

  const order = await razorpay.orders.create({
    amount: totalAmount,
    currency: 'INR',
  });

  const payment = await Payment.create({
    orderId: order.id,
    user: req.user.id,
    merchant: reserve.merchant,
    amount: totalAmount,
    type: TRANSACTION_TYPE.CREDIT,
    module: MODULE.BUY_RESERVE,
    data: {
      reserveId: reserve.id,
      productId: product.id,
      merchantId: reserve.merchant,
      weight,
      buyRate: payload.buyPrice,
      sellRate: payload.sellPrice,
      rate: reserve.rate,
      amount,
      tax,
      taxAmount,
      totalAmount,
    },
  });

  res.status(201).json({
    orderId: order.id,
    weight,
    amount: totalAmount,
    callbackUrl: `/payments/${payment.id}`,
  });
};

export const processBuyReserved = async (data, user) => {
  const reserve = await Reserve.findById(data.data.reserveId);

  const res = await buyGold({
    productId: data.data.productId,
    userId: user.id,
    merchantId: data.merchant,
    paymentId: data.id,
    module: MODULE.BUY_RESERVE,
    buyRate: data.data.buyRate,
    sellRate: data.data.sellRate,
    rate: data.data.rate,
    weight: data.data.weight,
    amount: data.data.amount,
    tax: data.data.tax,
    taxAmount: data.data.taxAmount,
    feeAmount: data.payment.fee,
    totalAmount: data.amount,
  });

  reserve.usedAt = res.createdAt;
  reserve.status = 'used';

  await reserve.save();

  return res;
};
