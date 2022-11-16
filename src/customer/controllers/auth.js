import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../../models/user.js';
import Gateway from '../../services/gateway.js';
import cryptoRandomString from 'crypto-random-string';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';
import { sendOTP } from '../../services/sms.js';
import { verifyJWT } from '../../utils/util.js';

export const sendOtp = async (req, res) => {
  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await redis.storeKey(
    `user_${req.body.mobile}`,
    {
      otp: await bcrypt.hash(otp, 12),
      isWhatsapp: req.body.isWhatsapp,
    },
    60 * 5
  );

  sendOTP(req.body.mobile, otp);

  res.status(201).json({
    message: 'Otp sent successfully',
  });
};

export const verifyOtp = async (req, res) => {
  const tempUser = await redis.getKey(`user_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const token = jwt.sign(
    { mobile: req.body.mobile },
    process.env.CUSTOMER_JWT_SECRET + 'verification',
    { expiresIn: '5m' }
  );

  await redis.deleteKey(`user_${req.body.mobile}`);

  res.status(201).json({
    token,
  });
};

export const login = async (req, res) => {
  let user = await User.findOne({ mobile: req.body.mobile });
  let isNewUser = false;

  const tempUser = await redis.getKey(`user_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  if (!user) {
    isNewUser = true;
    user = await User.create({
      mobile: req.body.mobile,
      isWhatsapp: tempUser.isWhatsapp,
      isPrivacyAccepted: true,
      userType: 1,
      deviceToken: req.body.deviceToken || null,
    });
  }

  const accessToken = jwt.sign(
    { id: user._id },
    process.env.CUSTOMER_JWT_SECRET,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRY }
  );

  const mpinToken = jwt.sign(
    { mobile: req.body.mobile },
    process.env.CUSTOMER_JWT_SECRET,
    { expiresIn: '5m' }
  );

  if (req.body.deviceToken && !isNewUser) {
    User.updateOne(
      { _id: user._id },
      { deviceToken: req.body.deviceToken }
    ).exec();
  }

  await redis.deleteKey(`user_${req.body.mobile}`);

  res.status(201).json({
    ...user.toJSON(),
    isNewUser,
    accessToken,
    mpinToken,
  });
};

export const resetMpin = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.CUSTOMER_JWT_SECRET + 'verification'
  );
  const user = await User.findOne({ mobile: payload.mobile });

  if (!user)
    throw new APIError(
      'mobile no is not registered',
      APIError.PHONE_NOT_REGISTERED
    );

  user.mpin = req.body.mpin;

  await user.save();

  res.status(201).json({
    message: 'success',
  });
};
