import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import LocationSchema from './location.js';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    fullName: String,
    mobile: { type: String, unique: true },
    email: { type: String, unique: true },
    image: { type: String, get: getS3Url },
    mpin: String,
    aadhaar: String,
    pan: String,
    role: {
      type: String,
      enum: ['manager', 'captain'],
    },
    modules: [
      {
        type: String,
        enum: [
          'delivery',
          'return',
          'verifier',
          'refiner',
          'accounting',
          'custodian',
        ],
      },
    ],
    merchant: {
      type: mongoose.Types.ObjectId,
      ref: 'merchant',
    },
    location: {
      type: LocationSchema,
      index: '2dsphere',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    deviceToken: String,
  },
  { timestamps: true }
);

schema.index({ mobile: 1 });
schema.index({ merchant: 1 });

schema.pre('save', async function (next) {
  if (this.isModified('mpin')) {
    this.mpin = await bcrypt.hash(this.mpin, 12);
  }

  next();
});

const MerchantUser = mongoose.model('merchantUser', schema);

export default MerchantUser;
