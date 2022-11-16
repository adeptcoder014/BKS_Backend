import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: ['user_to_user', 'user_to_business', 'business_to_business'],
    from: SchemaTypes.ObjectId({ ref: 'user' }),
    to: SchemaTypes.ObjectId({ ref: 'user' }),
    weight: Number,
    rate: Number,
    amount: Number,
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
    },
  },
  { timestamps: true }
);

const UPITransaction = mongoose.model('upiTransaction', schema);

export default UPITransaction;
