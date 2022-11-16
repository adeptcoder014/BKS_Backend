import joi from 'joi';

export const validateLogin = joi.object({
  email: joi.string().required(),
  password: joi.string().min(6).required(),
});

export const login = joi.object({
  email: joi.string().required(),
  password: joi.string().min(6).required(),
  code: joi.string().length(6).required(),
});

export const forgotPassword = joi.object({
  email: joi.string().email().required(),
});

export const resetPassword = joi.object({
  email: joi.string().email().required(),
  code: joi.string().length(6).required(),
});
