import joi from 'joi';

export const sendOtp = joi.object({
  mobile: joi.string().required().length(10),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean(),
});

export const verifyOtp = joi.object({
  mobile: joi.string().required().length(10),
  otp: joi.string().required().length(4),
});

export const login = joi.object({
  mobile: joi.string().required().length(10),
  otp: joi.string().required().length(4),
});

export const resetMpin = joi.object({
  token: joi.string().required(),
  mpin: joi.string().required().length(4),
});
