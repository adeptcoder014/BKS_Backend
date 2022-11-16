import mongoose, { Schema } from 'mongoose';
import { generateOrderId, SchemaTypes } from '../utils/util.js';
import LocationSchema from './location.js';

const schema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, default: generateOrderId() },
    type: { type: String, enum: ['sell', 'upload'] },
    weight: { type: Number },
    metalGroup: SchemaTypes.ObjectId({ ref: 'metalGroup' }),
    address: SchemaTypes.ObjectId({ ref: 'address' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    custodian: SchemaTypes.ObjectId({ ref: 'merchant' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
    verifiedGold: SchemaTypes.ObjectId({ ref: 'verifiedGold' }),
    amountPaid: Number,
    invoice: SchemaTypes.ObjectId({ ref: 'invoice' }),
    transaction: SchemaTypes.ObjectId({ ref: 'transaction' }),
    lastScheduledBy: {
      type: String,
      enum: ['user', 'merchant'],
      default: 'user',
    },
    requestedDate: { type: Date },
    scheduledDate: { type: Date },
    cancelledStage: {
      type: String,
      enum: ['before_verification', 'before_melting', 'after_melting'],
    },
    cancelledAt: Date,
    status: {
      type: String,
      enum: [
        'requested',
        'reschedule_requested',
        'booked',
        'completed',
        'cancelled',
      ],
      default: 'requested',
    },
  },
  { timestamps: true }
);

const Appointment = mongoose.model('appointment', schema);

export default Appointment;
