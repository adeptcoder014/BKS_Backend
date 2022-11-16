import joi from 'joi';
import validators from '../../utils/validators.js';

export const sendOtp = joi.object({
  mobile: joi.string().required().length(10),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean(),
});

export const verifyOtp = joi.object({
  mobile: joi.string().required().length(10),
  otp: joi.string().required().length(4),
});

export const resetMpin = joi.object({
  token: joi.string().required(),
  mpin: joi.string().required().length(4),
});

export const verifyDetails = joi.object({
  fullName: joi.string(),
  aadhaar: joi.string(),
  pan: joi.string(),
  gstNo: joi.string(),
  name: joi.string(),
  companyId: joi.string(),
});

export const registerAccount = joi.object({
  fullName: joi.string().required(),
  aadhaar: joi.string().required(),
  pan: joi.string().required(),
  email: joi.string().email().required(),
  gstNo: joi.string().required(),
  businessType: joi.string().valid('jewellery', 'commodity').required(),
  name: joi.string().required(),
  companyType: joi.string().required(),
  companyId: joi.string(),
  address: joi.string().required(),
  pincode: joi.string().required(),
  location: validators.location().required(),
  documents: joi.array().items(
    joi.object({
      name: joi.string().required(),
      file: validators.fileKey().required(),
    })
  ),
  modules: joi
    .array()
    .items(joi.string().valid('e-commerce', 'verifier', 'refiner'))
    .min(1)
    .required(),
});
