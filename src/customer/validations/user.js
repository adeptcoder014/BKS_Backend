import joi from 'joi';

export const createProfile = joi.object({
  email: joi.string().email().allow(''),
  fullName: joi.string().min(4).required(),
  accountType: joi.string().valid('individual', 'business').required(),
  gstNo: joi.string().when('accountType', {
    is: 'business',
    then: joi.required(),
    otherwise: joi.optional().allow(''),
  }),
  pan: joi.string().allow(''),
  aadhaar: joi.string().allow(''),
  referralCode: joi.string().allow(''),
});

export const resetMpin = joi.object({
  token: joi.string().required(),
  mpin: joi.string().length(4).required(),
});

export const updateUser = joi.object({
  fullName: joi.string().min(4),
  pan: joi.string().allow(''),
  aadhaar: joi.string().allow(''),
  email: joi.string().email().allow(''),
  dob: joi.string().allow(''),
  deviceToken: joi.string().allow(''),
});

export const verifyMpin = joi.object({
  mpin: joi.string().required(),
});

export const changeMobileNumber = joi.object({
  mobile: joi.string().length(10).required(),
  token: joi.string().required(),
});

export const changeMpin = joi.object({
  oldMpin: joi.string().length(4).required(),
  newMpin: joi.string().required(),
});

export const createAccount = joi.object({
  holderName: joi.string().required(),
  accountNo: joi.string().required(),
  ifsc: joi.string().required(),
  accountType: joi.string().required(),
});

export const updateAccount = joi.object({
  holderName: joi.string(),
  accountNo: joi.string(),
  ifsc: joi.string(),
  accountType: joi.string(),
});

export const primaryAccount = joi.object({
  accountId: joi.string().required(),
});

export const createAddress = joi.object({
  addressType: joi.string().required(),
  address: joi.string().required(),
  landmark: joi.string(),
  pincode: joi.number().required(),
});

export const updateAddress = joi.object({
  addressType: joi.string(),
  address: joi.string(),
  landmark: joi.string(),
  pincode: joi.number(),
});

export const primaryAddress = joi.object({
  addressId: joi.string().required(),
});
