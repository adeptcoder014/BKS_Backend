import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    type: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    typeId: {
      type: String,
      refPath: 'type',
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    image: { type: String, get: getS3Url },

    value: {
      type: Number,
      unique: false,
      required: true,
    },

    valueType: { type: String },
  },
  {
    timestamps: true,
  }
);

const Offer = mongoose.model('offer', schema);

export default Offer;
