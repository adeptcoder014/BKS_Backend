import joi from 'joi';

const create = joi.object({
  name: joi.string().required(),
  mobile: joi.string().length(10).required(),
  email: joi.string().email().required(),
  aadhaar: joi.string().required(),
  pan: joi.string().required(),
  gstNo: joi.string().required(),
  address: joi.string().required(),
  location: joi.array().items(joi.number()).length(2).required(),
  retainershipType: joi
    .string()
    .valid('commission_based', 'monthly_based')
    .required(),
  retainershipValue: joi.number(),
  commission: joi
    .object({
      buy: joi.number().required(),
      sell: joi.number().required(),
    })
    .required(),
  modules: joi
    .array()
    .items(joi.string().valid('custodian', 'e-commerce', 'verifier', 'refiner'))
    .required(),
  settlementInDays: joi.number().required(),
  limit: joi.number().required(0),
  eInvoiceApplicable: joi.boolean().required(),
});

const update = joi.object({
  name: joi.string(),
  mobile: joi.string().length(10),
  email: joi.string().email(),
  aadhaar: joi.string(),
  pan: joi.string(),
  gstNo: joi.string(),
  address: joi.string(),
  location: joi.array().items(joi.number()).length(2),
  retainershipType: joi.string().valid('commission_based', 'monthly_based'),
  retainershipValue: joi.number(),
  commission: joi.object({
    buy: joi.number().required(),
    sell: joi.number().required(),
  }),
  modules: joi
    .array()
    .items(
      joi.string().valid('custodian', 'e-commerce', 'verifier', 'refiner')
    ),
  settlementInDays: joi.number(),
  limit: joi.number(),
  eInvoiceApplicable: joi.boolean(),
});

export default {
  create,
  update,
};
