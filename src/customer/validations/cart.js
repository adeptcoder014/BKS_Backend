import joi from 'joi';
import validators from '../../utils/validators.js';

export const addItem = joi.object({
  id: validators.id().required(),
  quantity: joi.number().required(),
});

export const updateItem = joi.object({
  quantity: joi.number().required(),
});

export const updateCart = joi.object().pattern(/^/, joi.number().required());

export const checkout = joi.object({
  id: joi.string().allow(''),
  quantity: joi.number(),
  products: joi.object(),
});
