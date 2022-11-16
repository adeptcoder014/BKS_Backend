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

    icon: { type: String, get: getS3Url },
  },
  {
    timestamps: true,
  }
);

const Metal = mongoose.model('metal', schema);

export default Metal;
