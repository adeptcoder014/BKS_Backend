import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['given', 'release'] },
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    invoice: SchemaTypes.ObjectId({ ref: 'invoice' }),
    weight: { type: Number },
    module: {
      type: String,
    },
  },
  { timestamps: true }
);

const Custody = mongoose.model('custody', schema);

export default Custody;
