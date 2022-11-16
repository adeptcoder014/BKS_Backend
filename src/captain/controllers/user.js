import bcrypt from 'bcrypt';
import MerchantUser from '../../models/merchantUser.js';
import APIError from '../../utils/error.js';

export const getLoggedInUser = async (req, res) => {
  const user = req.user;

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    modules: user.modules,
    merchant: user.merchant,
    createdAt: user.createdAt,
    isMpinRegistered: !!user.mpin,
  });
};

export const updateProfile = async (req, res) => {
  const user = await MerchantUser.findById(req.user.id);

  Object.assign(user, req.body);

  if (req.body.location) {
    user.location = {
      coordinates: req.body.location,
    };
  }

  await user.save();

  res.json({
    message: 'success',
  });
};

export const verifyMpin = async (req, res) => {
  const user = await MerchantUser.findById(req.user.id).lean();
  const isValid = await bcrypt.compare(req.body.mpin, user.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  res.status(201).json({
    message: 'success',
  });
};

export const changeMpin = async (req, res) => {
  const user = await MerchantUser.findById(req.user.id);
  const isValid = await bcrypt.compare(req.body.oldMpin, user.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  user.mpin = req.body.newMpin;

  await user.save();

  res.status(201).json({
    message: 'success',
  });
};
