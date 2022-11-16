import mongoose from 'mongoose';
import {
  TRANSACTION_TYPE,
  CUSTODY_TYPE,
  TRANSACTION_STATUS,
  MODULE,
} from '../utils/constants.js';
import { enumToArray, SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: enumToArray(TRANSACTION_TYPE) },
    custody: { type: String, enum: enumToArray(CUSTODY_TYPE) },
    module: { type: String, enum: enumToArray(MODULE) },
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    payment: SchemaTypes.ObjectId({ ref: 'payment' }),
    invoiceUrl: SchemaTypes.S3,
    certificateUrl: SchemaTypes.S3,
    gstAmount: Number,
    amount: Number,
    weight: Number,
    buyRate: Number,
    sellRate: Number,
    status: { type: String, enum: enumToArray(TRANSACTION_STATUS) },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('transaction', schema);

export default Transaction;
