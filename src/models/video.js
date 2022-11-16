import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    language: { type: String, enum: ['english', 'hindi'] },
    category: { type: String },
    url: { type: String, required: true, get: getS3Url },
  },
  { timestamps: true }
);

const Video = mongoose.model('video', schema);

export default Video;
