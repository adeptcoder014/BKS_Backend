import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },
    image: SchemaTypes.S3,
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model('item', schema);

export default Item;
