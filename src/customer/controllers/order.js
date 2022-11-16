import dayjs from 'dayjs';
import groupBy from 'lodash/groupBy.js';
import mongoose from 'mongoose';
import {
  Order,
  Product,
  Cart,
  Payment,
  RefundRequest,
  ReturnOrder,
  Address,
  Merchant,
  MerchantUser,
} from '../../models/index.js';
import ParentOrder from '../../models/parentOrder.js';
import Gateway from '../../services/gateway.js';
import { cancelShipment, createShipment } from '../../services/logistic.js';
import razorpay from '../../services/razorpay.js';
import { getS3KeyFromUrl } from '../../services/s3.js';
import { getUserWallet, sellGold } from '../../services/user.js';
import { MODULE, TRANSACTION_TYPE } from '../../utils/constants.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import { generateOrderId, verifyJWT } from '../../utils/util.js';

export const getOrders = async (req, res) => {
  const data = await Order.find({ user: req.user.id })
    .lean({ getters: true })
    .sort({ createdAt: -1 });

  const transformed = data.reduce((pre, cur) => {
    const { items, ...order } = cur;
    for (const item of items) {
      pre.push({
        id: `${order.id}:${item.product}`,
        title: item.title,
        image: item.image,
        expectedDeliveryDate:
          order.shipping.estimatedDeliveryDate ?? new Date(),
        deliveredAt: order.deliveredAt ?? '',
        cancelledAt: order.cancelledAt ?? '',
        status: order.status,
      });
    }

    return pre;
  }, []);

  res.json(transformed);
};

export const getOrderById = async (req, res) => {
  const [orderId, productId] = req.params.id.split(':');

  const data = await Order.findOne({
    _id: orderId,
    user: req.user.id,
    'items.product': productId,
  })
    .populate('merchant')
    .populate({
      path: 'parentOrder',
      populate: {
        path: 'transactions',
        populate: 'merchant',
      },
    })
    .lean({
      getters: true,
    });

  if (!data)
    throw new APIError(
      'order could not be found',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const item = data.items.find((item) => item.product.equals(productId));

  res.json({
    id: `${orderId};${productId}`,
    title: item.title,
    image: item.image,
    seller: data.merchant.name,
    quantity: item.quantity,
    amount: item.totalAmount,
    shipping: {
      address: data.shipping.address,
      trackingUrl: data.shipping.trackingUrl,
      estimatedDeliveryDate: data.shipping.estimatedDeliveryDate ?? new Date(),
    },
    orderDetails: {
      id: data.parentOrder.orderId,
      invoiceUrl: '',
      itemCount: data.parentOrder.itemCount,
      totalAmount: data.parentOrder.totalAmount,
      refundAmount: data.parentOrder.refundAmount,
      redeemAmount: data.parentOrder.redeemAmount,
      paidAmount: data.parentOrder.paidAmount,
      custodyReleases: data.parentOrder.transactions.map((transaction) => ({
        id: transaction.merchant.id,
        transactionId: transaction.id,
        name: transaction.merchant.name,
        image: transaction.merchant.image,
        product: '24KT GOLD',
        weight: transaction.weight,
        createdAt: transaction.createdAt,
      })),
    },
    status: data.status,
  });
};

export const cancelOrder = async (req, res) => {
  const [orderId, productId] = req.params.id.split(':');

  const data = await Order.findOne({
    _id: orderId,
    user: req.user.id,
    'items.product': productId,
  });

  if (!data)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const item = data.items.find((item) => item.product.equals(productId));

  res.status(201).json({
    message: 'success',
  });
};

export const returnOrder = async (req, res) => {
  const [orderId, productId] = req.params.id.split(':');

  const data = await Order.findOne({
    _id: orderId,
    user: req.user.id,
    'items.product': productId,
  }).populate('merchant');

  if (!data)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const manager = await MerchantUser.findOne({
    merchant: data.merchant.id,
    role: 'manager',
    status: 'active',
  }).lean();

  const alreadyReturned = await ReturnOrder.exists({
    order: data.id,
    user: req.user.id,
  });

  const item = data.items.find((item) => item.product.equals(productId));
  const product = await Product.findById(productId);
  const isReturnable =
    dayjs().diff(dayjs(data.deliveredAt), 'day') <= product.returnPeriod;

  if (data.status !== 'delivered')
    throw new APIError('you cannot return items until it is delivered to you');
  if (alreadyReturned) throw new APIError('This item is already returned');
  if (!product?.isReturnable) throw new APIError('This item is not returnable');
  if (!isReturnable) throw new APIError('You cannot return this item now');

  const returnOrder = new ReturnOrder({
    orderId: generateOrderId(),
    user: req.user.id,
    order: data.id,
    merchant: data.merchant.id,
    manager: manager.id,
    shipFrom: data.shipping.address,
    shipTo: {
      fullName: manager.fullName,
      mobile: manager.mobile,
      fullAddress: data.merchant.address.address,
      pincode: data.merchant.address.pincode,
    },
    items: [
      {
        product: product.id,
        title: item.title,
        image: getS3KeyFromUrl(item.image),
        weight: item.weight,
        purity: item.purity,
        quantity: item.quantity,
        rate: item.rate,
        makingCharge: item.makingCharge,
        tax: item.tax,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        returnedReason: req.body.reason,
        status: 'pending',
      },
    ],
    status: 'placed',
  });

  const shipment = await createShipment({
    fromAddress: data.shipping.address,
    toAddress: process.env.SEQUEL_STORE_CODE || data.merchant.id,
    netWeight: item.weight,
    netValue: item.totalAmount,
  });

  returnOrder.docketNo = shipment.docketNo;
  returnOrder.brnNo = shipment.brnNo;
  returnOrder.estimatedDeliveryDate = shipment.estimatedDeliveryDate;
  returnOrder.trackingUrl = shipment.trackingUrl;

  await returnOrder.save();

  res.status(201).json({
    id: returnOrder.id,
    orderId: returnOrder.orderId,
    docketNo: returnOrder.docketNo,
    trackingUrl: returnOrder.trackingUrl,
  });
};

export const createOrder = async (req, res) => {
  const payload = verifyJWT(req.body.token, process.env.SECRET);
  const wallet = await getUserWallet(req.user.id);
  const address = await Address.findOne({
    _id: req.body.address,
    user: req.user.id,
  });
  const orders = [];
  const items = groupBy(payload.items, 'merchant');
  const refundAmount = req.body.refundAmount || 0;
  const redeemAmount = req.body.redeemAmount || 0;
  const amountToPay = roundValue(
    payload.totalAmount - refundAmount - redeemAmount,
    2
  );
  const redeemWeight = roundValue(redeemAmount / payload.buyPrice, 2);

  if (!address)
    throw new APIError(
      'address does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (wallet.redeemable < redeemWeight)
    throw new APIError(
      'insufficient gold balance',
      APIError.INSUFFICIENT_GOLD_BALANCE,
      400,
      {
        value: roundValue(redeemWeight - wallet.redeemable, 3),
      }
    );

  const parentOrder = new ParentOrder({
    orderId: generateOrderId(),
    user: req.user.id,
  });

  for (const merchantId in items) {
    const manager = await MerchantUser.findOne({
      merchant: merchantId,
      role: 'manager',
      status: 'active',
    }).lean();

    const order = new Order({
      orderId: generateOrderId(),
      user: req.user.id,
      merchant: merchantId,
      parentOrder: parentOrder.id,
      captain: {
        manager: manager.id,
      },
      items: [],
      shipping: {
        address: {
          fullName: req.user.fullName,
          mobile: req.user.mobile,
          ...address.format(),
        },
      },
    });

    parentOrder.itemCount += items[merchantId].length;

    for (const item of items[merchantId]) {
      order.items.push({
        product: item.id,
        title: item.title,
        image: item.image,
        weight: item.weight,
        purity: item.purity,
        quantity: item.quantity,
        makingCharge: item.makingCharge,
        rate: item.rate,
        tax: item.tax,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
      });

      order.totalAmount += item.totalAmount;
    }

    orders.push(order.toJSON());
  }

  parentOrder.weight = redeemWeight;
  parentOrder.refundAmount = refundAmount;
  parentOrder.redeemAmount = redeemAmount;
  parentOrder.paidAmount = amountToPay;
  parentOrder.totalAmount = payload.totalAmount;

  const order = await razorpay.orders.create({
    amount: amountToPay,
  });

  const payment = await Payment.create({
    type: TRANSACTION_TYPE.CREDIT,
    orderId: order.id,
    user: req.user.id,
    module: MODULE.ECOM,
    amount: amountToPay,
    data: {
      parentOrder: parentOrder.toJSON(),
      orders,
      weight: redeemWeight,
      rate: payload.buyPrice,
      tax: 0,
      taxAmount: 0,
      amount: redeemAmount,
      totalAmount: redeemAmount,
      subtotal: payload.subtotal,
    },
  });

  res.status(201).json({
    orderId: order.id,
    amount: amountToPay,
    callbackUrl: `/payments/${payment.id}`,
  });
};

export const processCreateOrder = async (data, user) => {
  const product = await Product.findById(process.env.GOLD_PRODUCT_ID)
    .populate('hsn')
    .lean();

  const sellData = await sellGold({
    userId: user.id,
    productId: product.id,
    merchantId: null,
    module: MODULE.ECOM,
    description: product.title,
    hsn: product.hsn.code,
    sellRate: data.data.rate,
    weight: data.data.weight,
    rate: data.data.rate,
    tax: data.data.tax,
    taxAmount: data.data.taxAmount,
    amount: data.data.amount,
    totalAmount: data.data.totalAmount,
  });

  const parentOrder = new ParentOrder({
    ...data.data.parentOrder,
    transactions: sellData.transactionIds,
    createdAt: sellData.createdAt,
  });

  const orders = data.data.orders.map(
    (item) =>
      new Order({
        ...item,
        parentOrder: parentOrder.id,
        items: item.items.map((e) => ({
          ...e,
          image: getS3KeyFromUrl(e.image),
        })),
        createdAt: sellData.createdAt,
      })
  );

  await Promise.all([parentOrder.save(), Order.bulkSave(orders)]);

  return {
    transactionId: data.paymentId,
    method: data.method,
    items: orders
      .map((order) =>
        order.items.map((item) => ({
          id: item.id,
          title: item.title,
          image: item.image,
          seller: 'bks',
          quantity: item.quantity,
          rate: item.rate,
          amount: item.totalAmount,
        }))
      )
      .flat(),
    subtotal: data.data.subtotal,
    refundAmount: parentOrder.refundAmount,
    redeemAmount: parentOrder.redeemAmount,
    paidAmount: parentOrder.paidAmount,
    totalAmount: parentOrder.totalAmount,
    availableRefund: 0,
    balanceWeight: sellData.balanceWeight,
    balanceWorth: sellData.balanceWorth,
    custodyReleases: sellData.custodyReleases,
    createdAt: sellData.createdAt,
  };
};
