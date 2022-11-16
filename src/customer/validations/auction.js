import joi from 'joi';
import validators from '../../utils/validators.js';

export const createAuction = joi.object({
  weight: joi.number().required(),
  rate: joi.number().required(),
});

export const createBid = joi.object({
  rate: joi.number().required(),
});

export const acceptBid = joi.object({
  account: validators.id().required(),
});

export const rejectBid = joi.object({});

export const counterBid = joi.object({
  rate: joi.number().required(),
});
