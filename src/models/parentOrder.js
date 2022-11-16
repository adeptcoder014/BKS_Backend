import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    orderId: String,
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    transactions: [SchemaTypes.ObjectId({ ref: 'transaction' })],
    weight: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    redeemAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    invoice: SchemaTypes.S3,
  },
  { timestamps: true }
);

const ParentOrder = mongoose.model('parentOrder', schema);

export default ParentOrder;
