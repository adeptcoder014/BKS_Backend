import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    id: { type: String, unique: true },
    type: { type: String, enum: ['bar', 'ball'] },
    box: SchemaTypes.ObjectId({ ref: 'goldBox' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    captain: {
      id: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      weight: Number,
      purity: Number,
      weightScaleImage: SchemaTypes.S3,
      purityScaleImage: SchemaTypes.S3,
    },
    manager: {
      id: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      weight: Number,
      purity: Number,
    },
    custodian: {
      manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      weight: Number,
      purity: Number,
      weightScaleImage: SchemaTypes.S3,
      purityScaleImage: SchemaTypes.S3,
    },
    weight: Number,
    purity: Number,
    refinedGold: SchemaTypes.ObjectId({ ref: 'refinedGold' }),
    addedAt: Date,
    checkedAt: Date,
    readyAt: Date,
    status: {
      type: String,
      enum: ['inactive', 'added', 'checked', 'ready', 'completed'],
    },
  },
  { timestamps: true }
);

const Gold = mongoose.model('gold', schema);

export default Gold;
