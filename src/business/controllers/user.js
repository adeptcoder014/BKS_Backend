import bcrypt from 'bcrypt';
import Business from '../../models/business.js';
import APIError from '../../utils/error.js';

export const getLoggedInUser = (req, res) => {
  res.json({
    ...req.user,
    isMpinRegistered: !!req.user.mpin,
    isBankRegistered: !!req.user.bank?.accountNo,
  });
};

export const updateProfile = async (req, res) => {
  const business = await Business.findById(req.user.id);

  Object.assign(business, req.body);

  await business.save();

  res.json({
    message: 'success',
  });
};

export const verifyMpin = async (req, res) => {
  const business = await Business.findById(req.user.id).lean();
  const isValid = await bcrypt.compare(req.body.mpin, business.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  res.status(201).json({
    message: 'success',
  });
};

export const changeMpin = async (req, res) => {
  const business = await Business.findById(req.user.id);
  const isValid = await bcrypt.compare(req.body.oldMpin, business.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  business.mpin = req.body.newMpin;

  await business.save();

  res.status(201).json({
    message: 'success',
  });
};
