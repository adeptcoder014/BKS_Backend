import joi from 'joi';
import validators from '../../utils/validators.js';

export const settleSales = joi.object({});

export const settlePurchases = joi.object({
  ids: joi.array().items(validators.id()).min(1).required(),
  transactionId: joi.string().required(),
  transactionMode: joi.string().required(),
  transactionDate: validators.date().required(),
  amount: joi.number().required(),
  bank: joi.string().required(),
});
