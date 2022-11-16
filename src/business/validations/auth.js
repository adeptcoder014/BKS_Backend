import joi from 'joi';

export const sendOtp = joi.object({
  mobile: joi.string().required().length(10),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean().valid(true).required(),
});

export const verifyOtp = joi.object({
  mobile: joi.string().length(10).required(),
  otp: joi.string().length(4).required(),
});

export const register = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  gstNo: joi.string().required(),
  pan: joi.string().required(),
  aadhaar: joi.string().required(),
  businessType: joi.string().valid('jewellery', 'commodity').required(),
  token: joi.string().required(),
});

export const verifyBank = joi.object({
  accountNo: joi.string().required(),
  ifsc: joi.string().required(),
  token: joi.string().required(),
});

export const registerBank = joi.object({
  accountNo: joi.string().required(),
  ifsc: joi.string().required(),
  bank: joi.string().required(),
  branch: joi.string().required(),
  token: joi.string().required(),
});

export const resetMpin = joi.object({
  token: joi.string().required(),
  mpin: joi.string().required().length(4),
});
