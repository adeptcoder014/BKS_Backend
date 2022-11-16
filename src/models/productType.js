import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    name: String,
    image: SchemaTypes.S3,
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ProductType = mongoose.model('productType', schema);

export default ProductType;
