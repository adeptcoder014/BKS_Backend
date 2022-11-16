import mongoose from 'mongoose';
import { PAYMENT_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import { enumToArray } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: enumToArray(TRANSACTION_TYPE) },
    method: { type: String },
    user: { type: mongoose.Types.ObjectId, ref: 'user' },
    merchant: { type: mongoose.Types.ObjectId, ref: 'merchant' },
    orderId: { type: String },
    eventId: { type: String },
    paymentId: { type: String },
    module: { type: String },
    data: { type: Object },
    fee: { type: Number },
    gst: { type: Number },
    amount: Number,
    settledAmount: Number,
    paidAt: Date,
    settledAt: Date,
    status: {
      type: String,
      enum: enumToArray(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('payment', schema);

export default Payment;
