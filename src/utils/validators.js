import dayjs from 'dayjs';
import joi from 'joi';
import mongoose from 'mongoose';

const validators = {
  id: () =>
    joi
      .string()
      .custom((value, helpers) => {
        if (mongoose.isObjectIdOrHexString(value) === false) {
          return helpers.error('objectId');
        }

        return value;
      })
      .messages({
        objectId: '{{#label}} must be a valid ObjectId',
      }),

  otp: () => joi.string().length(4),

  fileKey: () =>
    joi
      .string()
      .custom((value, helpers) => {
        if (value.length !== 25) {
          return helpers.error('fileKey');
        }

        return value;
      })
      .messages({
        fileKey: '{{#label}} must be a valid file key',
      }),

  json: (base) => {
    const custom = joi.extend((joi) => {
      return {
        type: base.type,
        base,
        coerce(value, schema) {
          try {
            return {
              value: typeof value === 'string' ? JSON.parse(value) : value,
            };
          } catch (err) {}
        },
      };
    });
    if (base.type === 'object') return custom.object();
    return custom.array();
  },

  location: () => joi.array().items(joi.number()).length(2),

  date: () =>
    joi
      .string()
      .custom((value, helpers) => {
        const date = dayjs(value, 'DD/MM/YYYY');
        if (!date.isValid()) return helpers.error('dateFormat');

        return date.toDate();
      })
      .messages({
        dateFormat: '{{#label}} must be in `DD/MM/YYYY` format',
      }),

  list: (items) => {
    if (!items) throw new Error('joi: items is required');
    const custom = joi.extend((joi) => {
      return {
        type: joi.array().type,
        base: joi.array(),
        coerce(value, schema) {
          try {
            return {
              value: value.split(','),
            };
          } catch (err) {}
        },
      };
    });

    return custom.array().items(items);
  },

  upi: () =>
    joi
      .string()
      .lowercase()
      .custom((value, helpers) => {
        const [mobile, appName] = value.split('@');
        if (mobile.length !== 10 || (appName && appName !== 'mygold')) {
          return helpers.error('invalidUPI');
        }
        return value;
      })
      .messages({
        invalidUPI: 'Invalid UPI ID',
      }),
};

export default validators;
