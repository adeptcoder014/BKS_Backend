import joi from 'joi';
import validators from '../../utils/validators.js';

export const createVehicle = joi.object({
  number: joi.string().required(),
  image: validators.fileKey().required(),
  status: joi.string().valid('available', 'unavailable'),
});

export const updateVehicle = joi.object({
  number: joi.string(),
  image: validators.fileKey(),
  status: joi.string().valid('available', 'unavailable'),
});
