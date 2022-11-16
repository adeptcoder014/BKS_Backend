import cryptoRandomString from 'crypto-random-string';
import dayjs from 'dayjs';
import {
  CyclePeriod,
  Payment,
  Plan,
  Product,
  Subscription,
} from '../../models/index.js';
import { getCalculation } from '../../services/application.js';
import { getGoldPrice } from '../../services/ecom.js';
import Gateway from '../../services/gateway.js';
import sendNotification from '../../services/notification.js';
import razorpay from '../../services/razorpay.js';
import { buyGold } from '../../services/user.js';
import {
  MODULE,
  SUBSCRIPTION_CYCLE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../utils/constants.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import { verifyJWT } from '../../utils/util.js';

export const getSubscriptions = async (req, res) => {
  const data = await Subscription.find({
    user: req.user.id,
    status: req.query.status || ['running', 'completed', 'forfeited'],
  }).lean();

  const finalData = data.map((item) => {
    const monthLeft = dayjs(item.maturityDate).diff(new Date(), 'month');

    return {
      id: item.id,
      type: item.type,
      min: item.min,
      cycle: item.cycle,
      cycleInWords: SUBSCRIPTION_CYCLE[item.cycle],
      duration: item.duration,
      monthLeft,
      isDue: dayjs().isAfter(item.dueDate),
      paymentDate: item.dueDate,
      status: item.status,
    };
  });

  res.json(finalData);
};

export const getSubscriptionById = async (req, res) => {
  const goldPrice = await getGoldPrice();
  const data = await Subscription.findOne({
    _id: req.params.id,
    user: req.user.id,
  })
    .lean({ getters: true })
    .populate('merchant');

  if (!data)
    throw new APIError(
      'subscription does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const { count, gold } = data.installments.reduce(
    (pre, cur) => {
      if (cur.type === 'credit') {
        pre.count += cur.count;
        pre.gold += cur.weight;
      }

      if (cur.type === 'hold') {
        pre.gold -= cur.weight;
      }

      if (cur.type === 'release') {
        pre.gold += cur.weight;
      }

      return pre;
    },
    { count: 0, gold: 0 }
  );

  const monthLeft = dayjs(data.maturityDate).diff(new Date(), 'month');
  const installmentCount = Math.ceil((data.duration * 30) / data.cycle);
  const installmentPaidCount = count;
  const installmentLeftCount = installmentCount - installmentPaidCount;

  res.json({
    id: data.id,
    type: data.type,
    min: data.min,
    cycle: data.cycle,
    cycleInWords: SUBSCRIPTION_CYCLE[data.cycle],
    duration: data.duration,
    monthLeft,
    isDue: dayjs().isAfter(data.dueDate),
    paymentDate: data.dueDate,
    merchant: {
      id: data.merchant.id,
      name: data.merchant.name,
      image: data.merchant.image,
    },
    weight: roundValue(gold, 3),
    worth: roundValue(gold * goldPrice.sellPrice, 2),
    installmentCount,
    installmentPaidCount,
    installmentLeftCount,
    skipLeft: data.maxSkip - data.skipCount,
    transferStatus: data.transferStatus,
    status: data.status,
    forfeitedAt: data.forfeitedAt ?? '',
    createdAt: data.createdAt,
  });
};

export const createSubscription = async (req, res) => {
  const product = await Product.findById(process.env.GOLD_PRODUCT_ID)
    .populate('hsn')
    .lean();
  const planBonus = await getCalculation('plan_bonus');
  const payload = verifyJWT(req.body.token, process.env.SECRET);

  let plan = null;
  let weight = 0;
  let rate = payload.buyPrice;
  let amount = 0;
  let tax = product.hsn.gst;
  let taxAmount = 0;
  let totalAmount = 0;

  const subscription = new Subscription({
    type: req.body.type,
    user: req.user.id,
    merchant: req.user.selectedMerchant,
    status: 'pending',
  });

  switch (req.body.type) {
    case 'standard':
      plan = await Plan.findById(req.body.plan).lean().populate('cyclePeriod');

      if (!plan)
        throw new APIError(
          'plan does not exist',
          APIError.RESOURCE_NOT_FOUND,
          404
        );
      break;

    case 'flexi':
      const cyclePeriod = await CyclePeriod.findById(req.body.cyclePeriod);

      if (!cyclePeriod)
        throw new APIError(
          'cyclePeriod does not exist',
          APIError.RESOURCE_NOT_FOUND,
          404
        );

      plan = new Plan({
        name: 'Flexi plan',
        type: 'flexi',
        mode: req.body.mode,
        cyclePeriod: cyclePeriod,
        duration: req.body.duration,
        min: req.body.weight || req.body.value,
        user: req.user.id,
      });
      break;
  }

  switch (plan.mode) {
    case 'weight':
      weight = roundValue(plan.min, 3);
      amount = roundValue(rate * weight, 2);
      taxAmount = roundValue(amount * (tax / 100), 2);
      totalAmount = roundValue(amount + taxAmount, 2);
      break;
    case 'value':
      totalAmount = roundValue(plan.min, 2);
      taxAmount = roundValue(totalAmount * (tax / 100), 2);
      amount = roundValue(totalAmount - taxAmount, 2);
      weight = roundValue(amount / rate, 3);
      break;
  }

  subscription.plan = plan.id;
  subscription.mode = plan.mode;
  subscription.cyclePeriod = plan.cyclePeriod.id;
  subscription.min = plan.min;
  subscription.duration = plan.duration;
  subscription.cycle = plan.cyclePeriod.cycle;
  subscription.gracePeriod = plan.cyclePeriod.gracePeriod;
  subscription.lockInPeriod = plan.cyclePeriod.lockInPeriod;
  subscription.maxSkip = plan.cyclePeriod.maxSkip;
  subscription.maxUnpaidSkip = plan.cyclePeriod.maxUnpaidSkip;
  subscription.maxUnpaidInvestment = plan.cyclePeriod.maxUnpaidInvestment;
  subscription.bonusWeight = roundValue(
    weight * subscription.duration * (planBonus / 100),
    2
  );

  await plan.save();
  await subscription.save();

  const order = await razorpay.orders.create({
    amount: totalAmount,
    currency: 'INR',
  });

  const payment = await Payment.create({
    orderId: order.id,
    user: req.user.id,
    merchant: req.user.selectedMerchant,
    type: TRANSACTION_STATUS.CREDIT,
    module: MODULE.BUY_SAVE,
    data: {
      subscriptionId: subscription.id,
      product: {
        id: product.id,
        description: product.title,
        hsn: product.hsn.code,
      },
      buyRate: payload.buyPrice,
      sellRate: payload.sellPrice,
      weight,
      amount,
      rate,
      tax,
      taxAmount,
      totalAmount,
    },
    amount: totalAmount,
  });

  res.status(201).json({
    orderId: order.id,
    weight,
    amount: totalAmount,
    callbackUrl: `/payments/${payment.id}`,
  });
};

export const payInstallment = async (req, res) => {
  const gst = await getCalculation('buy_gold_gst');
  const [subscription, goldPrice] = await Promise.all([
    Subscription.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .lean()
      .populate('cyclePeriod'),
    getGoldPrice(),
  ]);
  if (!subscription)
    throw new APIError(
      'subscription does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (subscription.status !== 'running')
    throw new APIError('Subscription is not running');

  const totalCount = subscription.installments.reduce((pre, cur) => {
    if (cur.type !== 'credit') return pre;
    return pre + cur.count;
  }, 0);

  let totalAmount = 0;
  let gstAmount = 0;
  let gold = 0;
  let prepaidValue = roundValue(
    subscription.min * roundValue(totalCount - Math.floor(totalCount), 3),
    3
  );
  let minimumToPay = subscription.min - prepaidValue;
  let maximumToPay =
    (subscription.duration * subscription.cyclePeriod.cycle - totalCount) *
    subscription.min;

  if (subscription.mode === 'weight') {
    if (!req.body.weight) throw new APIError('weight is required');
    if (req.body.weight < minimumToPay)
      throw new APIError(`Please enter ${minimumToPay} grams or more`);
    if (req.body.weight > maximumToPay)
      throw new APIError(`Gold amount should not exceed ${maximumToPay} grams`);

    totalAmount = req.body.weight * goldPrice.buyPrice * (1 + gst / 100);
    (gstAmount = req.body.weight * goldPrice), buyPrice * (gst / 100);
    gold = req.body.weight;
  }

  if (subscription.mode === 'value') {
    if (!req.body.value) throw new APIError('value is required');
    if (req.body.value < minimumToPay)
      throw new APIError(`Please enter ${minimumToPay} rupees or more`);
    if (req.body.value > maximumToPay)
      throw new APIError(`Amount should not exceed ${maximumToPay} rupees`);

    totalAmount = req.body.value * (1 + gst / 100);
    gstAmount = req.body.value * (gst / 100);
    gold = req.body.value / goldPrice.buyPrice;
  }

  totalAmount = roundValue(totalAmount);
  gstAmount = roundValue(gstAmount);
  gold = roundValue(gold, 3);

  const order = await razorpay.orders.create({
    amount: totalAmount,
    currency: 'INR',
  });

  const payment = await Payment.create({
    orderId: order.id,
    type: 'credit',
    user: req.user.id,
    module: 'subscription_installment',
    amount: totalAmount,
    data: {
      buyPrice: goldPrice.buyPrice,
      sellPrice: goldPrice.sellPrice,
      gold,
      subscriptionId: subscription.id,
      gst,
      gstAmount,
      lastTransaction:
        subscription.installments[subscription.installments.length - 1],
    },
  });

  res.status(201).json({
    gold,
    amount: totalAmount,
    orderId: order.id,
    callbackUrl: `/customer/payments/${payment.id}`,
  });
};

export const skipInstallment = async (req, res) => {
  const hold = await getCalculation('hold');
  const [subscription, buySell] = await Promise.all([
    Subscription.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('cyclePeriod'),
    getGoldPrice(),
  ]);

  if (!subscription)
    throw new APIError(
      'subscription does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  if (subscription.status !== 'running')
    throw new APIError('Subscription is not running');
  if (subscription.skipCount >= subscription.cyclePeriod.maxSkip)
    throw new APIError(
      `You can only skip ${subscription.cyclePeriod.maxSkip} times`
    );
  if (subscription.unpaidSkipCount >= subscription.cyclePeriod.maxUnpaidSkip)
    throw new APIError(
      `Cannot skip installment now, you have unpaid ${subscription.cyclePeriod.maxUnpaidSkip} skip`
    );

  const dueDate = dayjs(subscription.dueDate);
  const nextGraceDate = dayjs(dueDate).add(subscription.gracePeriod, 'hour');

  if (!dayjs().isBetween(dueDate, nextGraceDate))
    throw new APIError('Cannot skip installment now');

  const transactionId = Gateway.newObjectId();
  let gold = 0;

  if (subscription.mode === 'weight') {
    gold = subscription.min * (hold / 100);
  } else {
    gold = (subscription.min * (hold / 100)) / buySell.buyPrice;
  }

  gold = roundValue(gold, 3);

  await Gateway.submitTransaction(
    'CreateData',
    JSON.stringify({
      id: transactionId,
      docType: 'Transaction',
      paymentId: cryptoRandomString({ length: 6 }),
      userId: req.user.id,
      type: 'hold',
      module: 'buy_save',
      amount: 0,
      gold,
      buyRate: buySell.buyPrice,
      sellRate: buySell.sellPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'completed',
    })
  );

  subscription.installments.push({
    id: transactionId,
    type: 'hold',
    count: 0,
    amount: 0,
    gold,
    createdAt: new Date(),
  });

  /**
  subscription.dueDate = dayjs(subscription.dueDate)
    .add(subscription.cyclePeriod.cycle, 'day')
    .toDate();
  **/

  ++subscription.skipCount;

  await subscription.save();

  sendNotification({
    push: {
      token: req.body.deviceToken,
      title: 'Subscription skipped',
    },
  });

  res.status(201).json(subscription);
};

export const cancelSubscription = async (req, res) => {
  const handling = await getCalculation('handling_charge');
  const subscription = await Subscription.findById(req.params.id);
  if (!subscription)
    throw new APIError(
      'subscription does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (subscription.status !== 'running')
    throw new APIError('subscription is not running');

  const installments = await Gateway.evaluateTransaction(
    'Find',
    JSON.stringify({
      id: { $in: subscription.installments.map((item) => item.id) },
    })
  );

  const totalGold = roundValue(
    installments.reduce((gold, item) => {
      if (item.type === 'hold') {
        gold -= item.gold;
      } else if (['credit', 'release'].includes(item.type)) {
        gold += item.gold;
      }
      return gold;
    }, 0) *
      (1 - handling / 100),
    3
  );

  const transaction1Id = Gateway.newObjectId();

  await Promise.all([
    updateUserGold(req.user.id, {
      redeemableGold: totalGold,
      holdGold: -totalGold,
      'buySave.redeemable': totalGold,
      'buySave.hold': -totalGold,
    }),
    Gateway.submitTransaction(
      'CreateData',
      JSON.stringify({
        id: transaction1Id,
        docType: 'Transaction',
        type: 'transferred',
        module: 'buy_save',
        gold: totalGold,
        userId: req.user.id,
        paymentId: cryptoRandomString({ length: 6 }),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
      })
    ),
  ]);

  subscription.installments.push({
    id: transaction1Id,
    type: 'transferred',
    amount: 0,
    gold: totalGold,
    createdAt: new Date(),
  });

  subscription.status = 'forfeited';

  await subscription.save();

  sendNotification({
    sms: {
      mobile: req.user.mobile,
      content: `Dear ${req.user.fullName}, Thank you for trusting us  this far and we are sorry to see you cancel your planned BKS MyGold saving journey.  Bonus of ${totalGold} g for the plan is hereby withdrawn. BKS MyGold Bank Balance is ${totalGold} g. `,
    },
    push: {
      token: req.user.deviceToken,
      content: `Dear ${req.user.fullName}, Sorry but your GIP has been cancelled due to non-systematic payment of installments. The Bonus of ${totalGold} gram for the plan has been withdrawn. Your Current Gold Bank Balance is ${totalGold} gram.`,
    },
  });

  res.status(201).json(subscription);
};

export const processCreateSubscription = async (data, user) => {
  const subscription = await Subscription.findById(
    data.data.subscriptionId
  ).populate('merchant');

  if (subscription.status !== 'pending')
    throw new APIError('subscription already processed');

  const res = await buyGold({
    productId: process.env.GOLD_PRODUCT_ID,
    userId: subscription.user,
    merchantId: subscription.merchant.id,
    paymentId: data.id,
    module: MODULE.BUY_SAVE,
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

  subscription.installments.push({
    id: res.transactionId,
    count: 1,
    type: TRANSACTION_TYPE.CREDIT,
    weight: res.weight,
    amount: res.amount,
    createdAt: res.createdAt,
  });

  subscription.maturityDate = dayjs(res.createdAt)
    .add(subscription.duration * subscription.cycle, 'day')
    .toDate();
  subscription.dueDate = dayjs(res.createdAt)
    .add(subscription.cycle, 'day')
    .toDate();
  subscription.lastPaidAt = res.createdAt;
  subscription.status = 'running';

  await subscription.save();

  return res;
};
