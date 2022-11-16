import joi from 'joi';

export const upload = joi.object({});

export const release = joi.object({
  weight: joi.number().required(),
});
