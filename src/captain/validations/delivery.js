import joi from 'joi';
import validators from '../../utils/validators.js';

export const packOrder = joi.object({
  invoiceImage: validators.fileKey().required(),
  packageImage: validators.fileKey().required(),
});

export const shipOrder = joi.object({
  agentName: joi.string().required(),
  agentImage: validators.fileKey().required(),
  agentDocument: validators.fileKey().required(),
});

export const notifyManager = joi.object({});

export const handOverOrder = joi.object({
  openingVideo: validators.fileKey().required(),
  otp: validators.otp().required(),
});
