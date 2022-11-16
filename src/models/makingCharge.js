import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    supplier: SchemaTypes.ObjectId({ ref: 'variety' }),
    variety: SchemaTypes.ObjectId({ ref: 'variety' }),
    item: SchemaTypes.ObjectId({ ref: 'item' }),
    productType: SchemaTypes.ObjectId({ ref: 'productType' }),
    metalGroup: SchemaTypes.ObjectId({ ref: 'metalGroup' }),
    rates: [
      new mongoose.Schema({
        fromWeight: Number,
        toWeight: Number,
        rate: Number,
        rateType: {
          type: String,
          enum: [
            'net_weight',
            'gross_weight',
            'per_piece',
            'fixed',
            'gross_weight_percentage',
            'net_weight_percentage',
          ],
        },
      }),
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MakingCharge = mongoose.model('makingCharge', schema);

export default MakingCharge;
