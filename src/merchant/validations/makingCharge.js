import joi from 'joi';
import validators from '../../utils/validators.js';

export const createMakingCharge = joi.object({
  supplier: validators.id(),
  variety: validators.id().required(),
  item: validators.id().required(),
  productType: validators.id().required(),
  metalGroup: validators.id().required(),
  rates: joi
    .array()
    .items(
      joi.object({
        fromWeight: joi.number().required(),
        toWeight: joi.number().required(),
        rate: joi.number().required(),
        rateType: joi
          .string()
          .valid(
            'net_weight',
            'gross_weight',
            'per_piece',
            'fixed',
            'gross_weight_percentage',
            'net_weight_percentage'
          )
          .required(),
      })
    )
    .required(),
});

export const updateMakingCharge = joi.object({
  supplier: validators.id(),
  variety: validators.id(),
  item: validators.id(),
  productType: validators.id(),
  metalGroup: validators.id(),
  rates: joi.array().items(
    joi.object({
      fromWeight: joi.number().required(),
      toWeight: joi.number().required(),
      rate: joi.number().required(),
      rateType: joi
        .string()
        .valid(
          'net_weight',
          'gross_weight',
          'per_piece',
          'fixed',
          'gross_weight_percentage',
          'net_weight_percentage'
        )
        .required(),
    })
  ),
});
