import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util';

const schema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['old_gold', 'subscription'],
    },
    weight: Number,
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    subscription: SchemaTypes.ObjectId({ ref: 'subscription' }),
    merchant: SchemaTypes.ObjectId({ ref: 'user' }),
  },
  { timestamps: true }
);

const Upload = mongoose.model('upload', schema);

export default Upload;
