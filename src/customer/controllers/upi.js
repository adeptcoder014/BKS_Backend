import User from '../../models/user.js';
import Transaction from '../../models/transaction.js';
import UPITransaction from '../../models/upiTransaction.js';
import { getMobileFromUPI, verifyJWT } from '../../utils/util.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import { getUserWallet } from '../../services/user.js';

export const getUPI = async (req, res) => {
  const data = await User.findOne({
    mobile: getMobileFromUPI(req.params.id),
  })
    .lean()
    .select('fullName createdAt');

  if (!data)
    throw new APIError('upi does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  res.json({
    fullName: data.fullName,
    createdAt: data.createdAt,
  });
};

export const pay = async (req, res) => {
  const payload = verifyJWT(req.body.token, process.env.SECRET);
  const [wallet, receiver] = await Promise.all([
    getUserWallet(req.user.id),
    User.findOne({ mobile: getMobileFromUPI(req.body.upi) }).lean(),
  ]);

  const user = User.hydrate(req.user);
  const isValidMpin = user.verifyMpin(req.body.mpin);
  const mode = req.body.weight ? 'weight' : 'value';

  if (!isValidMpin) throw new APIError('Invalid mpin', APIError.INVALID_MPIN);
  if (!receiver)
    throw new APIError('upi does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  let weight;
  let amount;
  let rate = payload.buyPrice;

  switch (mode) {
    case 'weight':
      weight = roundValue(req.body.weight, 3);
      amount = roundValue(weight / rate, 2);
      break;
    case 'value':
      amount = roundValue(req.body.amount, 2);
      weight = roundValue(amount / rate, 3);
      break;
  }

  if (wallet.redeemable < weight) {
    throw new APIError(
      'Insufficient gold balance',
      APIError.INSUFFICIENT_GOLD_BALANCE,
      400,
      {
        value: roundValue(weight - wallet.redeemable, 3),
      }
    );
  }

  res.sendStatus(201);
};
