import joi from 'joi';
import validators from '../../utils/validators.js';

export const createProductType = joi.object({
  name: joi.string().required(),
  image: validators.fileKey(),
});

export const updateProductType = joi.object({
  name: joi.string(),
  image: validators.fileKey(),
});
