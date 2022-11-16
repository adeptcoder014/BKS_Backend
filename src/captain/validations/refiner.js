import joi from 'joi';
import validators from '../../utils/validators.js';

export const checkBag = joi.object({
  weight: joi.number().required(),
  image: validators.fileKey().required(),
  itemCount: joi.number().required(),
  video: validators.fileKey().required(),
});

export const checkBagItem = joi.object({
  openingVideo: validators.fileKey().required(),
  purityCheckingVideo: validators.fileKey().required(),
  weightScaleImage: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
  weight: joi.number().required(),
  purity: joi.number().required(),
});

export const accept = joi.object({
  raiseDispute: joi.boolean(),
});

export const startRefining = joi.object({
  ids: joi.array().items(validators.id()).min(1).required(),
  meltingVideo: validators.fileKey().required(),
});

export const updateOrder = joi.object({
  weight: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
});

export const addItem = joi.object({
  id: joi.string().required(),
  type: joi.string().valid('bar', 'ball').required(),
  weight: joi.number().required(),
  purity: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
});

export const updateItem = joi.object({
  type: joi.string().valid('bar', 'ball'),
  weight: joi.number().required(),
  purity: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
});

export const completeRefining = joi.object({});

export const notifyManager = joi.object({});

export const handOver = joi.object({
  otp: validators.otp().required(),
});
