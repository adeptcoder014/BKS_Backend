import Account from '../../models/account.js';
import { verifyBankAccount } from '../../services/sandbox.js';
import APIError from '../../utils/error.js';

export const getAccounts = async (req, res) => {
  const data = await Account.find({ user: req.user.id }).lean();
  res.json(data);
};

export const getAccountById = async (req, res) => {
  const data = await Account.findById(req.params.id).lean();
  if (!data)
    throw new APIError(
      'Account does not exists',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  res.json(data);
};

export const createAccount = async (req, res) => {
  const data = new Account({
    ...req.body,
    user: req.user.id,
  });

  const holderName = await verifyBankAccount(data.accountNo, data.ifsc);

  if (holderName.indexOf(data.holderName) === -1) {
    throw new APIError(
      'Account holder name is invalid',
      APIError.ACCOUNT_MISMATCH_NAME
    );
  }

  data.holderName = holderName;

  await data.save();

  res.status(201).json(data);
};

export const updateAccount = async (req, res) => {
  const holderName = await verifyBankAccount(req.body.accountNo, req.body.ifsc);

  if (holderName.indexOf(req.body.holderName) === -1) {
    throw new APIError(
      'Account holder name is invalid',
      APIError.ACCOUNT_MISMATCH_NAME
    );
  }

  const data = await Account.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    {
      ...req.body,
      holderName,
    },
    {
      new: true,
    }
  );
  res.json(data);
};

export const setPrimaryAccount = async (req, res) => {
  await Account.updateMany(
    { user: req.user.id },
    {
      isPrimary: false,
    }
  );

  await Account.updateOne(
    { _id: req.params.id, user: req.user.id },
    {
      isPrimary: true,
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

export const deleteAccount = async (req, res) => {
  const data = await Account.deleteOne({
    _id: req.params.id,
    user: req.user.id,
  });
  res.status(204).json(data);
};
