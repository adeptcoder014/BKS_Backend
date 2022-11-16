import mfa from 'node-2fa';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import cryptoRandomString from 'crypto-random-string';
import * as redis from '../../services/redis.js';
import User from '../../models/user.js';

export const validateLogin = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return res.status(400).json({
      message: 'user is not registered',
    });

  const isValidPassword = await user.verifyPassword(req.body.password);

  if (!isValidPassword)
    return res.status(400).json({
      message: 'Password do not match',
    });

  res.sendStatus(200);
};

export const login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return res.status(400).json({
      message: 'user is not registered',
    });

  const isValidPassword = await user.verifyPassword(req.body.password);
  const isValidCode =
    mfa.verifyToken(user.mfaSecret || '', req.body.code)?.delta === 0;

  if (!isValidPassword)
    return res.status(400).json({
      message: 'Password do not match',
    });

  if (!isValidCode)
    return res.status(400).json({
      message: 'Invalid 2fa code',
    });

  const accessToken = jwt.sign(
    { id: user.id, ip: req.ip },
    process.env.ADMIN_JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_JWT_EXPIRY,
      issuer: 'BKS MY GOLD',
    }
  );

  res.json({
    accessToken,
    expiresAt: new Date(ms(process.env.ADMIN_JWT_EXPIRY) + Date.now()),
  });
};

export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return res.status(400).json({
      message: 'user is not registered',
    });

  const code = cryptoRandomString({
    type: 'numeric',
    length: 6,
  });

  await redis.storeKey(`admin_${req.body.email}`, code, 60 * 10);
  await email();

  res.sendStatus(200);
};

export const resetPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return res.status(400).json({
      message: 'email is not registered',
    });

  const isValidOTP =
    (await redis.getKey(`admin_${user.email}`)) === req.body.code;

  if (!isValidOTP)
    return res.status(400).json({
      message: 'Invalid OTP',
    });

  user.password = req.body.password;

  await user.save();

  res.sendStatus(200);
};
