import joi from 'joi';
import validators from '../../utils/validators.js';

export const createOrder = joi.object({
  token: joi.string().required(),
  refundAmount: joi.number(),
  redeemAmount: joi.number(),
  address: validators.id().required(),
});

export const cancelOrder = joi.object({
  reason: joi.string().required(),
});

export const returnOrder = joi.object({
  reason: joi.string().required(),
});
