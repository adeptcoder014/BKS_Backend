import joi from 'joi';
import validators from '../../utils/validators.js';

export const createSubscription = joi.object({
  type: joi.string().valid('standard', 'flexi').required(),
  plan: validators.id().when('type', {
    is: 'standard',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  token: joi.string().required(),
  mode: joi.string().valid('weight', 'value').when('type', {
    is: 'flexi',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  weight: joi.number().when('mode', {
    is: 'weight',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  value: joi.number().when('mode', {
    is: 'value',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  cyclePeriod: validators.id().when('type', {
    is: 'flexi',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
});
