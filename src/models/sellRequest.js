import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    transactions: [SchemaTypes.ObjectId({ ref: 'transaction' })],
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    account: SchemaTypes.ObjectId({ ref: 'account' }),
    weight: { type: Number },
    rate: { type: Number },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'processing', 'completed'] },
  },
  { timestamps: true }
);

const SellRequest = mongoose.model('sellRequest', schema);

export default SellRequest;
