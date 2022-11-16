import Transaction from '../../models/transaction.js';
import UserWallet from '../../models/userWallet.js';
import { getGoldPrice } from '../../services/ecom.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';

export const getWallets = async (req, res) => {
  const { sellPrice } = await getGoldPrice();

  const wallets = await UserWallet.find({ user: req.user.id })
    .populate('merchant')
    .lean({ getters: true });

  const data = {
    weight: roundValue(
      wallets.reduce((prev, cur) => {
        prev += roundValue(cur.hold + cur.redeemable, 3);
        return prev;
      }, 0),
      3
    ),
    redeemable: roundValue(
      wallets.reduce((prev, cur) => {
        prev += roundValue(cur.redeemable, 3);
        return prev;
      }, 0),
      3
    ),
    details: {},
  };

  data.worth = roundValue(data.weight * sellPrice, 2);

  data.items = wallets.map((item) => ({
    id: item.merchant.id,
    name: item.merchant.name,
    image: item.merchant.image,
    weight: roundValue(item.hold + item.redeemable, 3),
    worth: roundValue(item.hold + item.redeemable * sellPrice, 2),
    details: Object.keys(item).reduce((prev, curr) => {
      const value = item[curr]?.total;

      if (value || value === 0) {
        prev[curr] = item[curr].total;
        data.details[curr] = (data.details[curr] ?? 0) + item[curr].total;
      }

      return prev;
    }, {}),
  }));

  res.json(data);
};

export const getWalletById = async (req, res) => {
  const { sellPrice } = await getGoldPrice();
  const data = await UserWallet.findOne({
    merchant: req.params.id,
    user: req.user.id,
  })
    .populate('merchant')
    .lean();
  if (!data)
    throw new APIError('wallet does not exist', APIError.RESOURCE_NOT_FOUND);

  res.json({
    id: data.merchant.id,
    name: data.merchant.name,
    image: data.merchant.image,
    weight: roundValue(data.hold + data.redeemable, 3),
    worth: roundValue(data.hold + data.redeemable * sellPrice, 2),
    details: Object.keys(data).reduce((prev, curr) => {
      const value = data[curr]?.total;

      if (value || value === 0) {
        prev[curr] = data[curr].total;
      }

      return prev;
    }, {}),
  });
};

export const getWalletTransactions = async (req, res) => {
  const data = await Transaction.find({
    merchant: req.params.id,
    user: req.user.id,
  }).lean();

  res.json(data);
};
