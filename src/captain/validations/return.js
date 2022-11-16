import joi from 'joi';
import validators from '../../utils/validators.js';

export const checkOrderItem = joi.object({
  checkingVideo: validators.fileKey().required(),
  rejectedReason: joi.string().when('status', {
    is: 'rejected',
    then: joi.required(),
    otherwise: joi.optional().allow(''),
  }),
  status: joi.string().valid('accepted', 'rejected').required(),
});

export const checkOrder = joi.object({
  openingVideo: validators.fileKey().required(),
});

export const handOverOrder = joi.object({
  otp: validators.otp().required(),
});
