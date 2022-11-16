import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import LocationSchema from './location.js';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    name: String,
    email: String,
    mobile: String,
    image: { type: String, get: getS3Url },
    businessType: { type: String, enum: ['jewellery', 'commodity'] },
    gstNo: String,
    pan: String,
    aadhaar: String,
    mpin: String,
    mfaSecret: String,
    deviceToken: String,
    bank: {
      holderName: String,
      bankName: String,
      accountNo: String,
      ifsc: String,
      branch: String,
    },
    address: {
      fullAddress: String,
      pincode: Number,
    },
    eInvoiceApplicable: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isWhatsapp: { type: Boolean, default: false },
    isProfileCreated: { type: Boolean, default: false },
    isPrivacyAccepted: { type: Boolean, default: false },
    location: {
      type: LocationSchema,
      index: '2dsphere',
    },
    deviceToken: String,
  },
  { timestamps: true }
);

schema.pre('save', async function (next) {
  if (this.isModified('mpin')) {
    this.mpin = await bcrypt.hash(this.mpin, 12);
  }

  next();
});

schema.methods.verifyMpin = function (mpin) {
  const isValid = bcrypt.compareSync(password, this.mpin);
  return isValid;
};

const Business = mongoose.model('business', schema);

export default Business;
