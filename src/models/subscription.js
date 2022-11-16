import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['standard', 'flexi'],
    },
    mode: {
      type: String,
      enum: ['weight', 'value'],
    },
    plan: SchemaTypes.ObjectId({ ref: 'plan' }),
    cyclePeriod: SchemaTypes.ObjectId({ ref: 'cyclePeriod' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    bonusWeight: { type: Number, default: 0 },
    min: Number,
    duration: Number,
    cycle: Number,
    gracePeriod: { type: Number, default: 0 },
    lockInPeriod: { type: Number, default: 0 },
    maxSkip: { type: Number, default: 0 },
    maxUnpaidSkip: { type: Number, default: 0 },
    maxUnpaidInvestment: { type: Number, default: 0 },
    skipCount: { type: Number, default: 0 },
    unpaidSkipCount: { type: Number, default: 0 },
    unpaidInvestments: { type: Number, default: 0 },
    installments: [
      new mongoose.Schema({
        _id: false,
        id: SchemaTypes.ObjectId({ ref: 'transaction' }),
        type: String,
        count: Number,
        weight: Number,
        amount: Number,
        createdAt: Date,
      }),
    ],
    dueDate: Date,
    maturityDate: Date,
    lastPaidAt: Date,
    forfeitedAt: Date,
    transferStatus: {
      type: String,
      enum: ['pending', 'shifted', 'uploaded'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'forfeited', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ user: 1, status: 1 });

const Subscription = mongoose.model('subscription', schema);

export default Subscription;
