import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    invoiceId: { type: String, unique: true },
    type: {
      type: String,
      enum: ['sale', 'purchase', 'advance', 'commission', 'service'],
    },
    category: {
      type: String,
      enum: [
        'custody',
        'old_gold',
        'receipt',
        'refund',
        'verification',
        'verification_cancelled',
        'refiner',
      ],
    },
    module: String,
    documentUrl: SchemaTypes.S3,
    certificateUrl: SchemaTypes.S3,
    document: {
      originalCopy: SchemaTypes.S3,
      customerCopy: SchemaTypes.S3,
    },
    certificate: {
      originalCopy: SchemaTypes.S3,
      customerCopy: SchemaTypes.S3,
    },
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    items: [
      new mongoose.Schema({
        id: SchemaTypes.ObjectId({ ref: 'product' }),
        hsn: String,
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number,
        tax: Number,
        taxAmount: Number,
        totalAmount: Number,
      }),
    ],
    tax: Number,
    taxAmount: Number,
    totalAmount: Number,
    settlementAmount: Number,
    settlement: SchemaTypes.ObjectId({ ref: 'settlement' }),
    commission: SchemaTypes.ObjectId({ ref: 'commission' }),
    payment: SchemaTypes.ObjectId({ ref: 'payment' }),
    transaction: SchemaTypes.ObjectId({ ref: 'transaction' }),
    status: {
      type: String,
      enum: ['paid', 'pending', 'processing', 'settled'],
    },
  },
  { timestamps: true }
);

const Invoice = mongoose.model('invoice', schema);

export default Invoice;
