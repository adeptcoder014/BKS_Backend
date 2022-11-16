import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: ['buyer', 'seller'],
    },
    auction: SchemaTypes.ObjectId({ ref: 'auction' }),
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    rate: Number,
    sellerStatus: {
      type: String,
      enum: ['waiting', 'accepted', 'rejected'],
      default: 'waiting',
    },
    buyerStatus: {
      type: String,
      enum: ['waiting', 'accepted', 'rejected'],
      default: 'waiting',
    },
    isCounter: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['waiting', 'accepted', 'rejected', 'expired', 'completed'],
      default: 'waiting',
    },
  },
  { timestamps: true }
);

const Bid = mongoose.model('bid', schema);

export default Bid;
