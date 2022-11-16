import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    name: {
      lowercase: false,
      trim: false,
      unique: false,
      type: String,
      required: true,
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
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'type',
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    image: { type: String, get: getS3Url },
  },
  {
    timestamps: true,
  }
);

const Slider = mongoose.model('slider', schema);

export default Slider;
