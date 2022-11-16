import { RefundRequest } from '../../models/index.js';
import Gateway from '../../services/gateway.js';
import { getUserWalletById, updateUserGold } from '../../services/user.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';

export const getRefundRequests = async (req, res) => {
  const status = req.query.type === 'apply' ? 'active' : { $ne: 'active' };

  const data = await RefundRequest.find({
    user: req.user.id,
    status,
  })
    .lean()
    .sort('-expiresAt');
  res.json(data);
};

export const getRefundRequestById = async (req, res) => {
  const data = await RefundRequest.findOne({
    user: req.user.id,
    _id: req.params.id,
  })
    .lean({ getters: true })
    .populate({
      path: 'order',
    })
    .populate(['products', 'history.order']);

  const wallet = await getUserWalletById(req.user.id);

  if (!data)
    throw new APIError(
      'refund entry does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data._id,
    order_id: data.order.id,
    orderId: data.order.orderId,
    orderDate: data.order.createdAt,
    orderTotal: data.order.totalAmount,
    refundGold: data.gold,
    refundAmount: data.amount,
    availableGold: roundValue(data.balance / data.buyRate, 2),
    availableAmount: data.balance,
    purity: '24 KT',
    buyPrice: data.buyRate,
    shippingAddress: data.order.shipping.address,
    items: data.products
      .map((product) => {
        const item = data.order.items.find((e) => e.product.equals(product.id));
        if (!item) return null;
        return {
          id: product.id,
          title: item.title,
          purity: item.purity || '24 KT',
          image: product.images[0],
          quantity: item.quantity,
          weight: item.weight,
          buyPrice: data.buyRate,
          makingCharge: item.makingCharge,
          gst: item.gst,
          gstAmount: item.gstAmount,
          subtotal: roundValue(item.total - item.gstAmount),
          total: item.total,
        };
      })
      .filter(Boolean),
    history: data.history.map((item) => ({
      id: item.order.id,
      orderId: item.order.orderId,
      orderDate: item.order.createdAt,
      amount: item.amount,
      gold: roundValue(item.amount / data.buyRate, 2),
      purity: '24 KT',
      goldBalance: wallet.gold,
    })),
    custodyNote: {
      purity: '24 KT',
      weight: data.gold,
      goldBalance: wallet.gold,
    },
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    status: data.status,
  });
};

export const requestRefund = async (req, res) => {
  const data = await RefundRequest.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  if (!data)
    throw new APIError(
      'refund entry does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (data.status !== 'active') throw new APIError('cannot apply for refund');
  if (dayjs(data.expiresAt).isBefore(new Date()))
    throw new APIError('You cannot apply for refund, date expired');

  data.status = 'processing';
  data.account = req.body.account;

  const transactionId = Gateway.newObjectId();
  const gold = roundValue(data.balance / data.buyRate, 3);

  const [wallet] = await Promise.all([
    updateUserGold(data.user, {
      hold: -gold,
      refundGold: -gold,
    }),
    Gateway.submitTransaction(
      'CreateData',
      JSON.stringify({
        id: transactionId,
        docType: 'Transaction',
        userId: data.user,
        type: 'debit',
        gold,
        buyRate: data.buyRate,
        module: 'refund',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
      })
    ),
    data.save(),
  ]);

  res.status(201).json({
    transactionId,
    gold,
    purity: '24 KT',
    amount: data.balance,
    note: 'Your money will be reflected in the Bank account within 24-48 hours',
    buyRate: data.buyRate,
    sellRate: data.buyRate,
    goldBalance: roundValue(wallet.redeemableGold + wallet.holdGold, 3),
  });
};
