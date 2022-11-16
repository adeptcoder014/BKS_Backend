import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    weight: Number,
    amount: Number,
    rate: Number,
    interestApplied: Number,
    interestWeight: Number,
    duration: Number,
    interest: SchemaTypes.ObjectId({ ref: 'interest' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    product: SchemaTypes.ObjectId({ ref: 'product' }),
    merchants: [SchemaTypes.ObjectId({ ref: 'merchant' })],
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    transactions: [SchemaTypes.ObjectId({ ref: 'transaction' })],
    installments: [
      new mongoose.Schema({
        _id: false,
        id: SchemaTypes.ObjectId({ ref: 'transaction' }),
        type: String,
        weight: Number,
        count: Number,
        createdAt: Date,
      }),
    ],
    dueDate: Date,
    usedAt: Date,
    expiresAt: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'used'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Reserve = mongoose.model('reserve', schema);

export default Reserve;
