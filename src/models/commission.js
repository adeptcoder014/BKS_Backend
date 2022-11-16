import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    invoice: SchemaTypes.ObjectId({ ref: 'invoice' }),
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'received'],
    },
  },
  { timestamps: true }
);

const Commission = mongoose.model('commission', schema);

export default Commission;
