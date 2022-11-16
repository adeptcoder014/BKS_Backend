import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import LocationSchema from './location.js';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    name: String,
    fullName: String,
    email: { type: String, unique: true },
    mobile: { type: String, unique: true },
    aadhaar: String,
    pan: String,
    gstNo: String,
    image: SchemaTypes.S3,
    mpin: String,
    businessType: {
      type: String,
      enum: ['jewellery', 'commodity'],
    },
    companyId: String,
    companyType: {
      type: String,
    },
    retainershipType: {
      type: String,
      enum: ['commission_based', 'monthly_based'],
      default: 'commission_based',
    },
    retainershipValue: Number,
    settlementInDays: Number,
    openingBalance: Number,
    limit: Number,
    eInvoiceApplicable: { type: Boolean, default: false },
    isWhatsapp: { type: Boolean, default: false },
    isPrivacyAccepted: { type: Boolean, default: false },
    deviceToken: String,
    modules: {
      type: [String],
      enum: ['custodian', 'e-commerce', 'verifier', 'refiner'],
    },
    commission: {
      buy: { type: Number, default: 0 },
      sell: { type: Number, default: 0 },
    },
    address: {
      fullAddress: String,
      pincode: String,
    },
    bank: {
      id: String,
      holderName: String,
      bankName: String,
      accountNo: String,
      ifsc: String,
      branch: String,
    },
    location: {
      type: LocationSchema,
      index: '2dsphere',
    },
    documents: [
      {
        name: String,
        file: SchemaTypes.S3,
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isHub: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

schema.index({ mobile: 1 });
schema.index({ location: '2dsphere' });

schema.pre('save', async function (next) {
  if (this.isModified('mpin')) {
    this.mpin = await bcrypt.hash(this.mpin, 12);
  }

  next();
});

const Merchant = mongoose.model('merchant', schema);

export default Merchant;
