import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    number: String,
    image: { type: String, get: getS3Url },
    merchant: { type: mongoose.Types.ObjectId, ref: 'merchant' },
    deleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      default: 'available',
    },
  },
  { timestamps: true }
);

const Vehicle = mongoose.model('vehicle', schema);

export default Vehicle;
