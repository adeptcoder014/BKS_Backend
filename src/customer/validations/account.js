import joi from 'joi';

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
