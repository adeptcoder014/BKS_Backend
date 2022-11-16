import UserWallet from '../models/userWallet.js';
import Transaction from '../models/transaction.js';
import Custody from '../models/custody.js';
import queue from '../services/queue.js';
import roundValue from '../utils/roundValue.js';
import {
  CUSTODY_TYPE,
  MODULE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../utils/constants.js';
import { generateOrderId, generateUniqueId } from '../utils/util.js';
import mongoose from 'mongoose';
import Product from '../models/product.js';
import Merchant from '../models/merchant.js';
import Settlement from '../models/settlement.js';
import Commission from '../models/commission.js';
import User from '../models/user.js';
import Invoice from '../models/invoice.js';

export const getUserWallet = async (userId) => {
  const data = await UserWallet.find({ user: userId })
    .lean({ getters: true })
    .populate('merchant')
    .sort({ total: -1, createdAt: -1 });

  const finalData = {
    total: 0,
    redeemable: 0,
    hold: 0,
  };

  for (const item of data) {
    finalData.total += item.total;
    finalData.redeemable += item.redeemable;
    finalData.hold += item.hold;
  }

  return {
    total: roundValue(finalData.total, 3),
    redeemable: roundValue(finalData.redeemable, 3),
    hold: roundValue(finalData.hold, 3),
    data,
  };
};

export const buyGold = async ({
  productId,
  userId,
  merchantId,
  paymentId,
  module,
  buyRate,
  sellRate,
  rate,
  weight,
  amount,
  tax,
  taxAmount,
  feeAmount,
  totalAmount,
}) => {
  const [product, merchant] = await Promise.all([
    Product.findById(productId).populate('hsn'),
    Merchant.findById(merchantId),
  ]);

  const invoiceId = generateOrderId();
  const date = new Date();

  const commissionAmount = roundValue(
    ((totalAmount - feeAmount) / 100) * (merchant.commission.buy / 100)
  );
  const settlementAmount = roundValue(
    (totalAmount - feeAmount) / 100 - commissionAmount
  );

  const transaction = new Transaction({
    type: TRANSACTION_TYPE.CREDIT,
    custody: CUSTODY_TYPE.GIVEN,
    module,
    user: userId,
    merchant: merchant.id,
    payment: paymentId,
    invoiceUrl: '',
    certificateUrl: '',
    amount: totalAmount,
    weight: weight,
    buyRate: rate,
    sellRate,
    status: TRANSACTION_STATUS.COMPLETED,
    createdAt: date,
  });

  const invoice = new Invoice({
    invoiceId,
    type: 'sale',
    category: 'custody',
    module,
    merchant: merchant.id,
    user: userId,
    items: [
      {
        id: product.id,
        hsn: product.hsn.code,
        description: product.title,
        quantity: weight,
        rate,
        amount: totalAmount,
        tax: tax,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
      },
    ],
    tax: tax,
    taxAmount: taxAmount,
    totalAmount: totalAmount,
    settlementAmount,
    payment: paymentId,
    status: 'pending',
    createdAt: date,
  });

  const custody = new Custody({
    type: CUSTODY_TYPE.GIVEN,
    merchant: invoice.merchant,
    user: invoice.user,
    invoice: invoice.id,
    weight: weight,
  });

  const settlement = new Settlement({
    type: 'outgoing',
    invoice: invoice.id,
    merchant: invoice.merchant,
    amount: settlementAmount,
    status: 'processing',
  });

  const commission = new Commission({
    invoice: invoice.id,
    amount: commissionAmount,
    status: 'pending',
  });

  invoice.settlement = settlement.id;
  invoice.commission = commission.id;

  const session = await mongoose.startSession();
  const update = {};
  let wallet;

  switch (module) {
    case MODULE.INSTANT:
      update['redeemable'] = weight;
      update['instant.redeemable'] = weight;
      break;
    case MODULE.BUY_SAVE:
      update['hold'] = weight;
      update['buySave.hold'] = weight;
      break;
    case MODULE.BUY_RESERVE:
      update['redeemable'] = weight;
      update['sellReserve.redeemable'] = weight;
  }

  try {
    await session.withTransaction(async (session) => {
      wallet = await UserWallet.updateGold({
        userId,
        merchantId,
        session,
        data: update,
      });

      await Promise.all([
        transaction.save({ session }),
        custody.save({ session }),
        invoice.save({ session }),
        settlement.save({ session }),
        commission.save({ session }),
      ]);
    });
  } catch (err) {
    throw err;
  } finally {
    await session.endSession();
  }

  return {
    transactionId: transaction.id,
    custodyId: custody.id,
    weight: weight,
    amount: totalAmount,
    description: product.title,
    custodyBy: {
      id: merchant.id,
      name: merchant.name,
      image: merchant.image,
    },
    balanceWeight: wallet.total,
    balanceWorth: roundValue(wallet.total * sellRate, 2),
    createdAt: date,
  };
};

export const sellGold = async ({
  userId,
  productId,
  merchantId,
  wallet,
  module,
  sellRate,
  description,
  hsn,
  weight,
  rate,
  amount,
  totalAmount,
  tax,
  taxAmount,
}) => {
  const transactionIds = [];
  const transactionOps = [];
  const updateOps = [];
  const custodyOps = [];
  const custodyReleases = [];

  wallet = wallet || (await getUserWallet(userId));
  const wallets = wallet.data.filter(
    (item) => !merchantId || item.merchant.equals(merchantId)
  );

  let leftWeight = weight;
  let date = new Date();

  for (const item of wallets) {
    if (leftWeight === 0) break;

    const releaseWeight =
      item.redeemable >= leftWeight ? leftWeight : item.redeemable;
    leftWeight -= releaseWeight;

    const transactionId = generateUniqueId();
    const custodyId = generateUniqueId();
    const update = {};

    switch (module) {
      case MODULE.INSTANT:
        update['redeemable'] = -releaseWeight;
        update['total'] = -releaseWeight;
        update['instant.redeemable'] = -releaseWeight;
        update['instant.total'] = -releaseWeight;
        break;
      case MODULE.SELL_RESERVE:
        update['total'] = -releaseWeight;
        update['redeemable'] = -releaseWeight;
        break;
    }

    updateOps.push({
      updateOne: {
        filter: { _id: item.id },
        update: {
          $inc: update,
        },
      },
    });

    custodyReleases.push({
      id: item.merchant.id,
      transactionId,
      custodyId,
      name: item.merchant.name,
      image: item.merchant.image,
      weight: releaseWeight,
      createdAt: date,
    });

    transactionIds.push(transactionId);

    transactionOps.push({
      insertOne: {
        document: {
          _id: transactionId,
          type: TRANSACTION_TYPE.DEBIT,
          custody: CUSTODY_TYPE.RELEASE,
          user: userId,
          merchant: item.merchant.id,
          module,
          weight: releaseWeight,
          sellRate: rate,
          amount: roundValue(releaseWeight * rate, 2),
          status: TRANSACTION_STATUS.PENDING,
          createdAt: date,
        },
      },
    });

    custodyOps.push({
      insertOne: {
        document: {
          _id: custodyId,
          type: CUSTODY_TYPE.RELEASE,
          user: userId,
          merchant: item.merchant.id,
          weight: releaseWeight,
          module,
          createdAt: Date,
        },
      },
    });
  }

  const session = await mongoose.startSession();

  await session.withTransaction(async (session) => {
    await Promise.all([
      UserWallet.bulkWrite(updateOps, { session }),
      Transaction.bulkWrite(transactionOps, { session }),
      Custody.bulkWrite(custodyOps, { session }),
    ]);
  });

  queue.addBulk(
    custodyReleases.map((item) => ({
      name: 'purchase',
      data: {
        userId,
        merchantId: item.id,
        transactionId: item.transactionId,
        custodyId: item.custodyId,
        item: {
          id: productId,
          description,
          hsn,
          quantity: item.weight,
          rate,
          amount,
          tax,
          taxAmount,
          totalAmount,
        },
        tax,
        taxAmount,
        totalAmount,
        date,
      },
    }))
  );

  const balanceWeight = roundValue(wallet.total - weight, 3);

  return {
    balanceWeight,
    balanceWorth: roundValue(balanceWeight * sellRate, 2),
    custodyReleases,
    transactionIds,
    createdAt: date,
  };
};
