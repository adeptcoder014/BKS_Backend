import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Business from '../../models/business.js';
import Gateway from '../../services/gateway.js';
import cryptoRandomString from 'crypto-random-string';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';
import { sendOTP } from '../../services/sms.js';
import { verifyJWT } from '../../utils/util.js';
import {
  verifyBankAccount,
  verifyGST,
  verifyIfsc,
} from '../../services/sandbox.js';

export const sendOtp = async (req, res) => {
  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await redis.storeKey(
    `business_${req.body.mobile}`,
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
  const user = await Business.findOne({ mobile: req.body.mobile }).lean();
  const tempUser = await redis.getKey(`business_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const accessToken = jwt.sign(
    {
      id: user?.id,
    },
    process.env.BUSINESS_JWT_SECRET,
    {
      expiresIn: process.env.BUSINESS_JWT_EXPIRY,
    }
  );

  const verificationToken = jwt.sign(
    { mobile: req.body.mobile },
    process.env.BUSINESS_JWT_SECRET + 'verification',
    { expiresIn: '30m' }
  );

  await redis.deleteKey(`business_${req.body.mobile}`);

  const payload = {
    verificationToken,
    isNewUser: !user,
    isMpinRegistered: !!user?.mpin,
    isBankRegistered: !!user?.bank?.accountNo,
  };

  if (user) payload.accessToken = accessToken;

  res.status(201).json(payload);
};

export const register = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.BUSINESS_JWT_SECRET + 'verification'
  );

  const business = new Business({
    ...req.body,
    mobile: payload.mobile,
  });

  await verifyGST(business.gstNo, business.name);

  await business.save();

  res.status(201).json(business);
};

export const verifyBank = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.BUSINESS_JWT_SECRET + 'verification'
  );

  const business = await Business.findOne({ mobile: payload.mobile });
  if (!business)
    throw new APIError(
      'business account not found',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const bank = await verifyIfsc(req.body.ifsc);
  const holderName = await verifyBankAccount(req.body.accountNo, req.body.ifsc);

  res.status(201).json({
    holderName,
    accountNo: req.body.accountNo,
    ifsc: req.body.ifsc,
    bank: bank.bank,
    branch: bank.branch,
  });
};

export const registerBank = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.BUSINESS_JWT_SECRET + 'verification'
  );

  const business = await Business.findOne({ mobile: payload.mobile });
  if (!business)
    throw new APIError(
      'business account not found',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  business.bank = {
    bankName: req.body.bank,
    accountNo: req.body.accountNo,
    ifsc: req.body.ifsc,
    branch: req.body.branch,
  };

  business.isVerified = true;

  await business.save();

  res.status(201).json({
    message: 'success',
  });
};

export const resetMpin = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.BUSINESS_JWT_SECRET + 'verification'
  );

  const user = await Business.findOne({ mobile: payload.mobile });
  if (!user)
    throw new APIError(
      'Mobile no is not registered',
      APIError.PHONE_NOT_REGISTERED
    );

  user.mpin = req.body.mpin;

  await user.save();

  res.status(201).json({
    message: 'success',
  });
};
