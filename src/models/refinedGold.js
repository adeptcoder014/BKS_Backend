import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
    captain: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
    items: [SchemaTypes.ObjectId({ ref: 'verifiedGold' })],
    meltingVideo: SchemaTypes.S3,
    otp: String,
    beforeRefining: {
      weight: Number,
      purity: Number,
    },
    weight: Number,
    purity: Number,
    weightScaleImage: SchemaTypes.S3,
    startedAt: Date,
    refinedAt: Date,
    submittedAt: Date,
    checkedAt: Date,
    status: {
      type: String,
      enum: ['started', 'refined', 'submitted', 'checked'],
      default: 'started',
    },
  },
  { timestamps: true }
);

const RefinedGold = mongoose.model('refinedGold', schema);

export default RefinedGold;
