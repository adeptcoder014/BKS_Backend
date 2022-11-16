import joi from 'joi';
import validators from '../../utils/validators.js';

export const updateProfile = joi.object({
  name: joi.string().min(3),
  image: validators.fileKey(),
  bank: joi.object({
    holderName: joi.string().required(),
    accountNo: joi.string().required(),
    ifsc: joi.string().required(),
  }),
  deviceToken: joi.string(),
});

export const verifyMpin = joi.object({
  mpin: joi.string().length(4).required(),
});

export const changeMpin = joi.object({
  oldMpin: joi.string().length(4).required(),
  newMpin: joi.string().length(4).required(),
});

export const createUser = joi.object({
  fullName: joi.string().min(3).required(),
  email: joi.string().email().required(),
  mobile: joi.string().length(10),
  aadhaar: joi.string().required(),
  image: validators.fileKey().required(),
  role: joi.string().required().valid('manager', 'captain'),
  modules: validators
    .list(
      joi
        .string()
        .valid(
          'delivery',
          'return',
          'verifier',
          'refiner',
          'custodian',
          'accounting'
        )
    )
    .min(1)
    .required(),
  status: joi.string().valid('active', 'inactive').default('active'),
});

export const updateUser = joi.object({
  fullName: joi.string().min(3),
  email: joi.string().email(),
  mobile: joi.string().length(10),
  aadhaar: joi.string(),
  image: validators.fileKey(),
  role: joi.string().valid('manager', 'captain'),
  modules: validators
    .list(
      joi
        .string()
        .valid(
          'delivery',
          'return',
          'verifier',
          'refiner',
          'custodian',
          'accounting'
        )
    )
    .min(1),
  location: validators.json(validators.location()),
  status: joi.string().valid('active', 'inactive'),
});
