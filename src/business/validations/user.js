import joi from 'joi';

export const updateProfile = joi.object({
  deviceToken: joi.string(),
});

export const verifyMpin = joi.object({
  mpin: joi.string().length(4).required(),
});

export const changeMpin = joi.object({
  oldMpin: joi.string().length(4).required(),
  newMpin: joi.string().length(4).required(),
});
