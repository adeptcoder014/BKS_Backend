import jwt from 'jsonwebtoken';
import { ToWords } from 'to-words';
import path from 'path';
import ejs from 'ejs';
import get from 'lodash/get.js';
import cryptoRandomString from 'crypto-random-string';
import APIError from './error.js';
import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';
import dayjs from 'dayjs';
import roundValue from './roundValue.js';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: {
        name: 'Paisa',
        plural: 'Paise',
        symbol: '',
      },
    },
  },
});

export const verifyJWT = (token, secret, throwError = true) => {
  try {
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (err) {
    if (throwError) throw new APIError('token expired', APIError.TOKEN_EXPIRED);
    return null;
  }
};

export const SchemaTypes = {
  S3: { type: String, get: getS3Url },
  ObjectId: ({ generate = false, ...rest }) => {
    const dataType = {
      type: mongoose.Types.ObjectId,
      ...rest,
    };

    if (generate) {
      dataType.default = () => new mongoose.Types.ObjectId();
    }

    return dataType;
  },
};

export const stringToObjectId = (id) => {
  if (typeof id === 'object') return id;
  return new mongoose.Types.ObjectId(id);
};

export const resolveObjectId = (documentOrId) => {
  const isValidObjectId = mongoose.isValidObjectId(documentOrId);
  if (isValidObjectId) return stringToObjectId(documentOrId);

  return documentOrId?._id ?? documentOrId?.Id;
};

export const generateUniqueId = () => {
  return new mongoose.Types.ObjectId();
};

export const generateOrderId = () => {
  const code = cryptoRandomString({
    type: 'numeric',
    length: 6,
  });

  return `BKS${code}`;
};

export const generateOtp = () => {
  const code = cryptoRandomString({
    type: 'numeric',
    length: 4,
  });

  return code;
};

export const generateQrCode = () => {
  const code = cryptoRandomString({
    type: 'hex',
    length: 30,
  });

  return code;
};

export const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const handleDuplicateError = (err, req, res) => {
  const key = Object.keys(err.keyPattern)[0];
  let message = `${key} is already taken`;

  switch (key) {
    case 'mobile':
      message = 'mobile number is already taken';
  }

  res.status(400).json({
    message,
    [key]: message,
    code: 11000,
  });
  console.error(err);
};

export const runAsynchronously = (fn) => {
  fn();
};

export const getArrayFieldSum = (array, field) => {
  return array.reduce((count, item) => {
    count += get(item, field);
    return count;
  }, 0);
};

export const getArrayFieldAvg = (array, field) => {
  return (
    array.reduce((count, item) => {
      count += get(item, field);
      return count;
    }, 0) / array.length
  );
};

export const calculateDiff = (a, b, alwaysPositive = true) => {
  const decreaseValue = a - b;
  return roundValue(
    alwaysPositive
      ? Math.abs((decreaseValue / a) * 100)
      : (decreaseValue / a) * 100,
    2
  );
};

export const parseDateFilter = (from, to) => {
  const createdAt = {};

  if (from) {
    createdAt['$gte'] = dayjs(from, 'DD/MM/YYYY').startOf('day').toDate();
  }

  if (to) {
    createdAt['$lte'] = dayjs(to, 'DD/MM/YYYY').startOf('day').toDate();
  }

  if (createdAt['$gte'] || createdAt['$lte']) {
    return {
      createdAt,
    };
  }

  return {};
};

export const getXAxisValue = async (days) => {
  if (days <= 30) return 'day';
  if (days <= 90) return 'week';
  if (days <= 365) return 'year';
  return 'year';
};

export const parseTemplate = (file, data) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(path.resolve(file), data, (err, html) => {
      if (err) reject(err);
      resolve(html);
    });
  });
};

export const convertCurrency = (currency) => {
  return toWords.convert(currency);
};

export const enumToArray = (type) => {
  return Object.values(type);
};

export const getMobileFromUPI = (upi) => {
  const [mobile] = upi.split('@');

  return mobile;
};
