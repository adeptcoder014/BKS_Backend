import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    holderName: String,
    accountNo: String,
    ifsc: String,
    accountType: String,
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Account = mongoose.model('account', schema);

export default Account;
