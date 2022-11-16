import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cryptoRandomString from 'crypto-random-string';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';
import { sendOTP } from '../../services/sms.js';
import { verifyJWT } from '../../utils/util.js';
import Merchant from '../../models/merchant.js';
import {
  getCompanyDetails,
  verifyAadhaar,
  verifyGST,
  verifyPan,
} from '../../services/sandbox.js';

export const sendOtp = async (req, res) => {
  const otp = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  await redis.storeKey(
    `merchant_${req.body.mobile}`,
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
  const merchant = await Merchant.findOne({ mobile: req.body.mobile }).lean();
  const tempUser = await redis.getKey(`merchant_${req.body.mobile}`, true);
  const isValidOTP = await bcrypt.compare(req.body.otp, tempUser?.otp || '');

  if (!isValidOTP) throw new APIError('Invalid OTP', APIError.INVALID_OTP);

  const accessToken = jwt.sign(
    {
      id: merchant?.id,
    },
    process.env.MERCHANT_JWT_SECRET,
    {
      expiresIn: process.env.MERCHANT_JWT_EXPIRY,
    }
  );

  const verificationToken = jwt.sign(
    { mobile: req.body.mobile },
    process.env.MERCHANT_JWT_SECRET + 'verification',
    { expiresIn: '30m' }
  );

  await redis.deleteKey(`merchant_${req.body.mobile}`);

  const payload = {
    verificationToken,
    isNewMerchant: !merchant,
    isMpinRegistered: !!merchant?.mpin,
    isBankRegistered: !!merchant?.bank?.accountNo,
    isVerified: !!merchant?.isVerified,
  };

  if (merchant) payload.accessToken = accessToken;

  res.status(201).json(payload);
};

export const resetMpin = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.MERCHANT_JWT_SECRET + 'verification'
  );

  const merchant = await Merchant.findOne({ mobile: payload.mobile });
  if (!merchant)
    throw new APIError(
      'mobile no is not registered',
      APIError.PHONE_NOT_REGISTERED
    );

  merchant.mpin = req.body.mpin;

  await merchant.save();

  res.status(201).json({
    message: 'success',
  });
};

export const verifyDetails = async (req, res) => {
  const [aadhaar, pan, gst, company] = await Promise.all([
    req.body.aadhaar && verifyAadhaar(req.body.aadhaar),
    req.body.pan && verifyPan(req.body.fullName, req.body.pan),
    req.body.gstNo && verifyGST(req.body.gstNo),
    req.body.companyId && getCompanyDetails(req.body.companyId),
  ]);

  if (aadhaar?.[0]) throw new APIError(aadhaar[0], APIError.INVALID_AADHAAR_NO);
  if (pan?.[0]) throw new APIError(pan[0], APIError.INVALID_PAN_NO);

  res.status(201).json({
    message: 'success',
    data: {
      name: gst?.name,
      type: gst?.type,
      address: gst?.address,
      pincode: gst?.pincode,
    },
  });
};

export const registerAccount = async (req, res) => {
  const payload = verifyJWT(
    req.body.token,
    process.env.MERCHANT_JWT_SECRET + 'verification'
  );

  const data = new Merchant({
    ...req.body,
    mobile: payload.mobile,
    location: {
      coordinates: req.body.location,
    },
  });

  await data.save();

  res.status(201).json(data);
};
