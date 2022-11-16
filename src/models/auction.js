import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    account: SchemaTypes.ObjectId({ ref: 'account' }),
    bid: SchemaTypes.ObjectId({ ref: 'bid' }),
    weight: Number,
    rate: Number,
    bidCount: { type: Number, default: 0 },
    acceptedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    status: {
      type: String,
      enum: ['active', 'waiting', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Auction = mongoose.model('auction', schema);

export default Auction;
