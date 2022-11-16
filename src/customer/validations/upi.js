import joi from 'joi';
import validators from '../../utils/validators.js';

export const getUPI = joi.object({
  id: validators.upi().required(),
});

export const pay = joi
  .object({
    upi: validators.upi().required(),
    weight: joi.number(),
    amount: joi.number(),
    token: joi.string().required(),
    mpin: joi.string().length(4).required(),
  })
  .xor('weight', 'amount');
