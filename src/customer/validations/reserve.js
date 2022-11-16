import joi from 'joi';
import validators from '../../utils/validators.js';

export const createReserve = joi.object({
  token: joi.string().required(),
  amount: joi.number().required(),
  duration: joi.number().required(),
  account: validators.id().required(),
  merchant: validators.id().allow(''),
});
