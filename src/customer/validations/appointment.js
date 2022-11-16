import joi from 'joi';
import validators from '../../utils/validators.js';

export const createAppointment = joi.object({
  type: joi.string().valid('sell', 'upload').required(),
  weight: joi.number().required(),
  metalGroup: validators.id().required(),
  address: validators.id().required(),
  date: joi.string().required(),
  time: joi.string().required(),
});
