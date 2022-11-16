import joi from 'joi';
import validators from '../../utils/validators.js';

export const createSecurityGuard = joi.object({
  fullName: joi.string().required().min(3),
});

export const startVerifying = joi.object({
  vehicle: validators.id().required(),
  securityGuards: joi.array().items(validators.id()).min(1).required(),
  location: validators.location(),
});

export const reachedLocation = joi.object({
  location: validators.location(),
});

export const addItem = joi.object({
  name: joi.string().required(),
  image: validators.fileKey().required(),
  grossWeight: joi.number().required(),
  grossPurity: joi.number().required(),
  styles: validators.json(
    joi.array().items(
      joi.object({
        style: validators.id().required(),
        pieceCount: joi.number().required(),
        weight: joi.number().required(),
        rate: joi.number().required(),
        rateAppliedOn: joi.string().required().valid('weight', 'piece'),
      })
    )
  ),
});

export const updateItem = joi.object({
  name: joi.string(),
  image: validators.fileKey(),
  grossWeight: joi.number(),
  grossPurity: joi.number(),
  styles: validators.json(
    joi.array().items(
      joi.object({
        style: validators.id().required(),
        pieceCount: joi.number().required(),
        weight: joi.number().required(),
        rate: joi.number().required(),
        rateAppliedOn: joi.string().required().valid('weight', 'piece'),
      })
    )
  ),
});

export const sendOTP = joi.object({});

export const verifyOTP = joi.object({
  otp: validators.otp().required(),
});

export const meltGold = joi.object({
  netWeight: joi.number().required(),
  purity: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
  purityScaleImage: validators.fileKey().required(),
  location: validators.location(),
});

export const uploadGold = joi.object({
  isDeclared: joi.boolean().required(),
});

export const sellGold = joi.object({});

export const reject = joi.object({
  otp: validators.otp().required(),
  location: validators.location(),
});

export const pickItems = joi.object({
  otp: validators.otp().required(),
  qrCode: joi.string().required(),
  sealingVideo: validators.fileKey().required(),
  weight: joi.number().required(),
  weightScaleImage: validators.fileKey().required(),
  location: validators.json(validators.location()),
});

export const notifyManager = joi.object({});

export const handOverRequest = joi.object({
  otp: validators.otp().required(),
  location: validators.location(),
});
