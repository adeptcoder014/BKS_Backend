import joi from 'joi';
import validators from '../../utils/validators.js';

export const createUser = joi.object({
  fullName: joi.string().required(),
  email: joi.string().required(),
  mobile: joi.string().required(),
  userType: joi.number().valid(1, 2).required(),
  accountType: joi.string().valid('individual', 'business').required(),
  dob: joi.string(),
  password: joi.string().min(6).required(),
  gstNo: joi.string().when('accountType', {
    is: 'business',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  eInvoiceApplicable: joi.boolean().default(false),
  mfaEnabled: joi.boolean().default(true),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean(),
  role: joi.string(),
  referral: {
    type: validators.id(),
    code: joi.string(),
    downloads: joi.number(),
    subscriptions: joi.number(),
  },
});

export const updateUser = joi.object({
  fullName: joi.string(),
  email: joi.string(),
  mobile: joi.string(),
  userType: joi.number().valid(1, 2),
  accountType: joi.string().valid('individual', 'business'),
  dob: joi.string(),
  password: joi.string().min(6),
  gstNo: joi.string().when('accountType', {
    is: 'business',
    then: joi.required(),
    otherwise: joi.optional(),
  }),
  eInvoiceApplicable: joi.boolean(),
  mfaEnabled: joi.boolean(),
  isWhatsapp: joi.boolean(),
  isPrivacyAccepted: joi.boolean(),
  role: joi.string(),
  referral: {
    type: validators.id(),
    code: joi.string(),
    downloads: joi.number(),
    subscriptions: joi.number(),
  },
});
