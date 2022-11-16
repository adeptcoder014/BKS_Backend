import joi from 'joi';

const create = joi.object({
  app: joi.string().valid('customer', 'merchant', 'business', 'captain'),
  category: joi.string(),
  question: joi.string().required(),
  answer: joi.string().required(),
});

const update = joi.object({
  app: joi.string().valid('customer', 'merchant', 'business', 'captain'),
  category: joi.string(),
  question: joi.string(),
  answer: joi.string(),
});

export default {
  create,
  update,
};
