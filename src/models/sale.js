import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sale', 'purchase', 'advance', 'commission', 'service'],
    },
    merchant: SchemaTypes({ ref: 'merchant' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    items: [
      new mongoose.Schema({
        id: SchemaTypes.ObjectId({ ref: 'product' }),
        hsn: SchemaTypes.ObjectId({ ref: 'hsn' }),
        description: String,
        quantity: Number,
        rate: Number,
        gst: Number,
        gstAmount: Number,
        amount: Number,
      }),
    ],
    gst: Number,
    gstAmount: Number,
    totalAmount: Number,
    processingFee: Number,
    commissionAmount: Number,
    finalAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'settled'],
    },
  },
  { timestamps: true }
);

const Sale = mongoose.model('Sale', schema);

export default Sale;
