import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import MerchantUser from '../../models/merchantUser.js';
import cryptoRandomString from 'crypto-random-string';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';
import { sendOTP } from '../../services/sms.js';
import { verifyJWT } from '../../utils/util.js';

export const sendOtp = async (req, res) => {
  const user = await MerchantUser.findOne({ mobile: req.body.mobile });
  if (!user)
    throw new APIError(
      'mobile no is not registered',
      APIError.PHONE_NOT_REGISTERED
    );

  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await redis.storeKey(
    `captain_${req.body.mobile}`,
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
  const tempUser = await redis.getKey(`captain_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const token = jwt.sign(
    { mobile: req.body.mobile },
    process.env.CAPTAIN_JWT_SECRET + 'verification',
    { expiresIn: '5m' }
  );

  await redis.deleteKey(`captain_${req.body.mobile}`);

  res.status(201).json({
    token,
  });
};

export const login = async (req, res) => {
  const user = await MerchantUser.findOne({ mobile: req.body.mobile });
  const tempUser = await redis.getKey(`captain_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!user)
    throw new APIError(
      'mobile no is not registered',
      APIError.PHONE_NOT_REGISTERED
    );
  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.CAPTAIN_JWT_SECRET,
    { expiresIn: process.env.CAPTAIN_JWT_EXPIRY }
  );

  const mpinToken = jwt.sign(
    { mobile: req.body.mobile },
    process.env.CAPTAIN_JWT_SECRET + 'verification',
    { expiresIn: '5m' }
  );

  if (req.body.deviceToken) {
    MerchantUser.updateOne(
      { _id: user.id },
      { deviceToken: req.body.deviceToken }
    ).exec();
  }

  await redis.deleteKey(`captain_${req.body.mobile}`);

  res.status(201).json({
    ...user.toJSON(),
    isMpinRegistered: !!user.mpin,
    accessToken,
    mpinToken,
  });
};

export const resetMpin = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.CAPTAIN_JWT_SECRET + 'verification'
  );
  const user = await MerchantUser.findOne({ mobile: payload.mobile });
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
