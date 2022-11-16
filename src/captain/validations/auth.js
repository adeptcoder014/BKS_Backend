import joi from 'joi';
import validators from '../../utils/validators.js';

export const sendOtp = joi.object({
  mobile: joi.string().required().length(10),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean(),
});

export const verifyOtp = joi.object({
  mobile: joi.string().required().length(10),
  otp: validators.otp().required(),
});

export const login = joi.object({
  mobile: joi.string().required().length(10),
  otp: validators.otp().required(),
});

export const resetMpin = joi.object({
  mobile: joi.string().required().length(10),
  token: joi.string().required(),
  mpin: joi.string().required().length(4),
});
