import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { getS3Url } from '../services/s3.js';
import LocationSchema from './location.js';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    mobile: String,
    image: { type: String, get: getS3Url },
    dob: String,
    password: String,
    mpin: String,
    mfaSecret: String,
    accountType: { type: String, enum: ['individual', 'business'] },
    userType: { type: Number, enum: [1, 2] },
    gstNo: String,
    selectedMerchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    deviceToken: String,
    eInvoiceApplicable: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isWhatsapp: { type: Boolean, default: false },
    isProfileCreated: { type: Boolean, default: false },
    isPrivacyAccepted: { type: Boolean, default: false },
    role: SchemaTypes.ObjectId({ ref: 'role' }),
    location: LocationSchema,
    referral: {
      type: SchemaTypes.ObjectId({ ref: 'referralType' }),
      code: { type: String, unique: true },
      downloads: { type: Number, default: 0 },
      subscriptions: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

schema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  if (this.isModified('mpin')) {
    this.mpin = await bcrypt.hash(this.mpin, 12);
  }

  next();
});

schema.methods.verifyPassword = function (password) {
  const isValid = bcrypt.compareSync(password, this.password);
  return isValid;
};

schema.methods.verifyMpin = function (mpin) {
  const isValid = bcrypt.compareSync(mpin.toString(), this.mpin || ' ');
  return isValid;
};

const User = mongoose.model('user', schema);

export default User;
