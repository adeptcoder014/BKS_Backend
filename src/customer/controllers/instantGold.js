import razorpay from '../../services/razorpay.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import Gateway from '../../services/gateway.js';
import { Merchant, Payment, Product, SellRequest } from '../../models/index.js';
import { getCalculation } from '../../services/application.js';
import {
  convertCurrency,
  generateOrderId,
  runAsynchronously,
  verifyJWT,
} from '../../utils/util.js';
import { buyGold, getUserWallet, sellGold } from '../../services/user.js';
import UserWallet from '../../models/userWallet.js';
import notify, { NotificationType } from '../../utils/notification.js';
import { generateInvoice } from '../../services/pdf.js';
import Invoice from '../../models/invoice.js';
import Settlement from '../../models/settlement.js';
import Commission from '../../models/commission.js';
import dayjs from 'dayjs';
import Custody from '../../models/custody.js';
import Transaction from '../../models/transaction.js';
import {
  CUSTODY_TYPE,
  MODULE,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../utils/constants.js';
import { getGoldPrice } from '../../services/ecom.js';

export const buyInstantGold = async (req, res) => {
  if (!req.user.selectedMerchant)
    throw new APIError(
      'Please choose custodian',
      APIError.CUSTODIAN_NOT_SELECTED
    );

  const payload = verifyJWT(req.body.token, process.env.SECRET);
  const merchant = await Merchant.findById(req.user.selectedMerchant).lean();
  const product = await Product.findById(process.env.GOLD_PRODUCT_ID)
    .populate('hsn')
    .lean();
  const mode = req.body.weight ? 'weight' : 'value';

  if (!merchant)
    throw new APIError(
      'merchant does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  let weight = 0;
  let amount = 0;
  let tax = product.hsn.gst;
  let taxAmount = 0;
  let totalAmount = 0;

  switch (mode) {
    case 'weight':
      weight = roundValue(req.body.weight, 3);
      amount = roundValue(weight * payload.buyPrice);
      taxAmount = roundValue(amount * (textAnnotation / 100));
      totalAmount = roundValue(amount + taxAmount);
      break;
    case 'value':
      taxAmount = roundValue(req.body.value * (tax / 100));
      amount = roundValue(req.body.value - taxAmount);
      weight = roundValue(amount / payload.buyPrice, 3);
      total = roundValue(amount + taxAmount);
      break;
    default:
      throw new APIError('Please provide either weight or value');
  }

  const order = await razorpay.orders.create({
    amount: totalAmount,
    currency: 'INR',
  });

  const payment = await Payment.create({
    orderId: order.id,
    amount: totalAmount,
    user: req.user.id,
    merchant: merchant.id,
    type: TRANSACTION_TYPE.CREDIT,
    module: MODULE.INSTANT,
    status: PAYMENT_STATUS.PENDING,
    data: {
      productId: product.id,
      merchantId: merchant.id,
      weight,
      buyRate: payload.buyPrice,
      sellRate: payload.sellPrice,
      rate: payload.buyPrice,
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

export const sellInstantGold = async (req, res) => {
  const payload = verifyJWT(req.body.token, process.env.SECRET);
  const [wallet, gst, product] = await Promise.all([
    getUserWallet(req.user.id),
    getCalculation('sell_gold_gst'),
    Product.findById(process.env.GOLD_PRODUCT_ID).populate('hsn'),
  ]);
  const mode = req.body.weight ? 'weight' : 'value';

  let weight = 0;
  let amount = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  switch (mode) {
    case 'weight':
      weight = roundValue(req.body.weight, 3);
      amount = roundValue(weight * payload.sellPrice, 2);
      taxAmount = roundValue(amount * (gst / 100), 2);
      totalAmount = roundValue(amount + taxAmount, 2);
      break;
    case 'value':
      totalAmount = roundValue(req.body.value, 2);
      taxAmount = roundValue(totalAmount * (gst / 100), 2);
      amount = roundValue(totalAmount - taxAmount, 2);
      weight = roundValue((totalAmount - taxAmount) / payload.sellPrice, 3);
      break;
    default:
      throw new APIError('Please provide either weight or value');
  }

  const request = new SellRequest({
    user: req.user.id,
    account: req.body.account,
    weight,
    rate: payload.sellPrice,
    amount: totalAmount,
    status: 'pending',
  });

  switch (req.body.custody) {
    case 'all':
      if (wallet.redeemable < weight)
        throw new APIError(
          'Insufficient gold balance',
          APIError.INSUFFICIENT_GOLD_BALANCE,
          400,
          {
            value: roundValue(weight - wallet.redeemable, 3),
          }
        );
      break;
    case 'selected':
      const redeemableWeight =
        wallet.data.find((item) =>
          item.merchant.equals(req.user.selectedMerchant)
        )?.redeemable ?? 0;

      if (redeemableWeight < weight)
        throw new APIError(
          'Insufficient gold balance',
          APIError.INSUFFICIENT_GOLD_BALANCE,
          400,
          {
            value: roundValue(weight - redeemableWeight, 3),
          }
        );

      break;
  }

  const data = await sellGold({
    userId: req.user.id,
    productId: product.id,
    merchantId:
      req.body.custody === 'selected' ? req.user.selectedMerchant : null,
    wallet,
    module: MODULE.INSTANT,
    description: product.title,
    hsn: product.hsn.code,
    sellRate: payload.sellPrice,
    weight,
    rate: payload.sellPrice,
    tax: gst,
    taxAmount,
    amount,
    totalAmount,
  });

  request.transactions = data.transactionIds;

  await request.save();

  res.status(201).json({
    weight,
    totalAmount,
    description: product.title,
    custodyReleases: data.custodyReleases,
    balanceWeight: data.balance,
    balanceAmount: roundValue(data.balance * payload.sellPrice),
  });
};

export const processInstantGoldBuy = async (data, user) => {
  const res = await buyGold({
    productId: process.env.GOLD_PRODUCT_ID,
    userId: user.id,
    merchantId: data.merchant,
    paymentId: data.id,
    module: MODULE.INSTANT,
    buyRate: data.data.buyRate,
    sellRate: data.data.sellRate,
    rate: data.data.buyRate,
    weight: data.data.weight,
    amount: data.data.amount,
    tax: data.data.tax,
    taxAmount: data.data.taxAmount,
    feeAmount: data.payment.fee,
    totalAmount: data.amount,
  });

  notify({
    email: user.email,
    mobile: user.mobile,
    deviceToken: user.deviceToken,
    type: NotificationType.INSTANT_BUY_GOLD,
    data: {
      weight: res.weight,
      amount: res.amount,
      balance: res.balanceWeight,
    },
  });

  return res;
};
