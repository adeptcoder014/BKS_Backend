import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['verifiedGold', 'gold'] },
    item: SchemaTypes.ObjectId({ refPath: 'itemType' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    user: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
  },
  { timestamps: true }
);

const Dispute = mongoose.model('dispute', schema);

export default Dispute;
