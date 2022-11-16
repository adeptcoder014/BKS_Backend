import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['incoming', 'outgoing'] },
    invoices: [SchemaTypes.ObjectId({ ref: 'invoice' })],
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    amount: Number,
    transactionDetails: {
      id: String,
      mode: String,
      amount: Number,
      bank: String,
      date: Date,
    },
    settledAt: Date,
    status: {
      type: String,
      enum: ['processing', 'settled'],
    },
  },
  { timestamps: true }
);

const Settlement = mongoose.model('settlement', schema);

export default Settlement;
