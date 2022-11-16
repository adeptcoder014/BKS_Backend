import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../../models/user.js';
import UserWallet from '../../models/userWallet.js';
import { createReferral, processReferral } from '../../services/referral.js';
import { verifyAadhaar, verifyPan, verifyGST } from '../../services/sandbox.js';
import APIError from '../../utils/error.js';
import * as redis from '../../services/redis.js';
import { getGoldPrice } from '../../services/ecom.js';
import { getArrayFieldSum } from '../../utils/util.js';
import roundValue from '../../utils/roundValue.js';
import Transaction from '../../models/transaction.js';

export const getLoggedInUser = async (req, res) => {
  const user = req.user;

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    upi: `${user.mobile}@mygold`,
    accountType: user.accountType,
    userType: user.userType,
    selectedMerchant: user.selectedMerchant ?? '',
    deviceToken: user.deviceToken,
    isWhatsapp: user.isWhatsapp,
    isVerified: user.isVerified,
  });
};

export const getUserWallet = async (req, res) => {
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
    id: item.id,
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

export const getUserTransactions = async (req, res) => {
  const { offset, limit, type } = req.query;
  const query = Transaction.find({ user: req.user.id }).lean();

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (type) query.where({ type });

  const data = await query;

  res.json(data);
};

export const createProfile = async (req, res) => {
  const user = req.user;

  if (user.isProfileCreated)
    throw new APIError(
      'profile is already created',
      APIError.PROFILE_ALREADY_CREATED
    );

  Object.assign(user, req.body);

  if (req.body.pan || req.body.aadhaar) {
    const [panRes, aadhaarRes] = await Promise.all([
      req.body.pan && verifyPan(user.fullName, req.body.pan),
      req.body.aadhaar && verifyAadhaar(req.body.aadhaar),
    ]);

    if (req.body.pan && panRes[0])
      throw new APIError(panRes[0], APIError.INVALID_PAN);
    if (req.body.aadhaar && aadhaarRes[0])
      throw new APIError(aadhaarRes[0], APIError.INVALID_AADHAAR);
  }

  if (user.accountType === 'business') {
    await verifyGST(req.body.gstNo, user.fullName);
  }

  if (!user.referralCode) {
    await createReferral(user.id, user.fullName);
  }

  if (req.body.referralCode) {
    processReferral(user.id, req.body.referralCode);
  }

  delete user.image;

  await User.updateOne(
    { _id: user.id },
    {
      ...user,
      isProfileCreated: true,
    }
  );

  res.status(201).json(user);
};

export const updateUser = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.sendStatus(401);

  Object.assign(user, req.body);

  if (req.file) {
    user.image = req.file.key;
  }

  if (req.body.pan || req.body.aadhaar) {
    const [panRes, aadhaarRes] = await Promise.all([
      req.body.pan && verifyPan(user.fullName, req.body.pan),
      req.body.adhaar && verifyAadhaar(req.body.aadhaar),
    ]);

    if (req.body.pan && panRes[0])
      throw new APIError(panRes[0], APIError.INVALID_PAN);
    if (req.body.aadhaar && aadhaarRes[0])
      throw new APIError(aadhaarRes[0], APIError.INVALID_AADHAAR);
  }

  await user.save();

  res.json({
    ...user.toJSON(),
    pan: req.body.pan,
    adhaar: req.body.aadhaar || null,
  });
};

export const changeMobileNumber = async (req, res) => {
  const [user, tempUser] = await Promise.all([
    User.findOne({ mobile: req.body.mobile }).lean(),
    redis.getKey(`user_${req.body.mobile}`),
  ]);
  const isValidOTP = await bcrypt.compare(tempUser?.otp || '', 12);

  try {
    const payload = jwt.verify(
      req.body.mobile,
      process.env.CUSTOMER_JWT_SECRET
    );
    if (payload.mobile !== req.body.mobile) return res.sendStatus(403);
  } catch (err) {
    throw new APIError('token expired', APIError.TOKEN_EXPIRED);
  }

  if (user)
    throw new APIError(
      'mobile no is already taken',
      APIError.PHONE_ALREADY_REGISTERED
    );
  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  await User.updateOne({ _id: req.user.id }, { mobile: req.body.mobile });
  await redis.deleteKey(`user_${req.body.mobile}`);

  res.status(201).json({
    message: 'success',
  });
};

export const verifyMpin = async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const isValid = await bcrypt.compare(req.body.mpin, user.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  res.status(201).json({
    message: 'success',
  });
};

export const changeMpin = async (req, res) => {
  const user = await User.findById(req.user.id);
  const isValid = await bcrypt.compare(req.body.oldMpin, user.mpin);

  if (!isValid) throw new APIError('Invalid MPIN', APIError.INVALID_MPIN);

  user.mpin = req.body.newMpin;

  await user.save();

  res.status(201).json({
    message: 'success',
  });
};
