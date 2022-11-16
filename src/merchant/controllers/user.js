import bcrypt from 'bcrypt';
import Merchant from '../../models/merchant.js';
import MerchantUser from '../../models/merchantUser.js';
import APIError from '../../utils/error.js';
import razorpay from '../../services/razorpay.js';
import { verifyBankAccount, verifyIfsc } from '../../services/sandbox.js';

export const getLoggedInUser = (req, res) => {
  const merchant = req.user;

  res.json({
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    mobile: merchant.mobile,
    gstNo: merchant.gstNo,
    image: merchant.image || '',
    settlementInDays: merchant.settlementInDays,
    eInvoiceApplicable: merchant.eInvoiceApplicable,
    isWhatsapp: merchant.isWhatsapp,
    modules: merchant.modules,
    address: merchant.address,
    isMpinRegistered: !!merchant.mpin,
    isHub: !!merchant.isHub,
    isVerified: !!merchant.isVerified,
  });
};

export const updateProfile = async (req, res) => {
  const merchant = await Merchant.findById(req.user.id);

  if (req.body.name) merchant.name = req.body.name;
  if (req.body.image) merchant.image = req.body.image;
  if (req.body.deviceToken) merchant.deviceToken = req.body.deviceToken;

  if (req.body.bank) {
    // const bank = await verifyIfsc(req.body.bank.ifsc);
    // const holderName = await verifyBankAccount(
    //   req.body.bank.accountNo,
    //   req.body.bank.ifsc
    // );

    // if (holderName.toLowerCase().indexOf(req.body.bank.holderName) === -1) {
    //   throw new APIError(
    //     'holder name does not match with provided account details',
    //     APIError.ACCOUNT_MISMATCH_NAME
    //   );
    // }
    const bank = {};

    merchant.bank = {
      id: account.id,
      holderName: req.body.bank.holderName,
      bankName: bank.bank,
      accountNo: req.body.bank.accountNo,
      ifsc: bank.ifsc,
      branch: bank.branch,
    };
  }

  await merchant.save();

  res.json({
    message: 'success',
  });
};

export const verifyMpin = async (req, res) => {
  const merchant = await Merchant.findById(req.user.id).lean();

  const isValid = await bcrypt.compare(req.body.mpin, merchant.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  res.status(201).json({
    message: 'success',
  });
};

export const changeMpin = async (req, res) => {
  const merchant = await Merchant.findById(req.user.id);
  const isValid = await bcrypt.compare(req.body.oldMpin, merchant.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  merchant.mpin = req.body.newMpin;

  await merchant.save();

  res.status(201).json({
    message: 'success',
  });
};

export const createUser = async (req, res) => {
  const data = new MerchantUser(req.body);

  data.merchant = req.user.id;

  await data.save();

  res.status(201).json(data);
};

export const getUsers = async (req, res) => {
  const { role, modules, status, q } = req.query;
  const filter = {};

  if (q) {
    filter.fullName = new RegExp(q, 'gi');
  }

  if (modules) filter.modules = { $in: modules.split(',') };
  if (req.query.role) filter.role = role;
  if (req.query.status) filter.status = status;

  const data = await MerchantUser.find({
    ...filter,
    merchant: req.user.id,
  }).lean({
    getters: true,
  });

  res.json(data);
};

export const getUserById = async (req, res) => {
  const data = await MerchantUser.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });
  if (!data)
    throw new APIError('user does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  res.json(data);
};

export const updateUser = async (req, res) => {
  const data = await MerchantUser.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError('user does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  Object.assign(data, req.body);

  if (req.body.location) {
    data.location = {
      coordinates: req.body.location,
    };
  }

  await data.save();

  res.json(data);
};

export const deleteUser = async (req, res) => {
  await MerchantUser.deleteOne({ _id: req.params.id, merchant: req.user.id });

  res.json({
    message: 'success',
  });
};
