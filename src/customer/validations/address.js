import joi from 'joi';
import validators from '../../utils/validators.js';

export const createAddress = joi.object({
  address: joi.string().required(),
  addressType: joi.string().required(),
  landmark: joi.string(),
  pincode: joi.number().required(),
  location: validators.location().required(),
});

export const updateAddress = joi.object({
  address: joi.string(),
  addressType: joi.string(),
  landmark: joi.string(),
  pincode: joi.number(),
  location: validators.location(),
});
