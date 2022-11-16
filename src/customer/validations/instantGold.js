import joi from 'joi';
import validators from '../../utils/validators.js';

export const buyGold = joi
  .object({
    token: joi.string().required(),
    weight: joi.number(),
    value: joi.number(),
  })
  .xor('weight', 'value');

export const sellGold = joi
  .object({
    token: joi.string().required(),
    weight: joi.number(),
    value: joi.number(),
    account: validators.id().required(),
    custody: joi.string().valid('all', 'selected').required(),
  })
  .xor('weight', 'value');
