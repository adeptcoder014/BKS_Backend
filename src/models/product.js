import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    title: String,
    description: String,
    type: SchemaTypes.ObjectId({ ref: 'productType' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    metalGroup: SchemaTypes.ObjectId({ ref: 'metalGroup' }),
    stock: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    pieceCount: Number,
    grossWeight: Number,
    purityWeight: Number,
    styleWeight: Number,
    netWeight: Number,
    hsn: SchemaTypes.ObjectId({ ref: 'hsn' }),
    makingCharge: SchemaTypes.ObjectId({ ref: 'makingCharge' }),
    sku: String,
    huid: String,
    width: String,
    height: String,
    item: SchemaTypes.ObjectId({ ref: 'item' }),
    images: { type: [String], get: getS3Url },
    video: SchemaTypes.S3,
    collectionId: SchemaTypes.ObjectId({ ref: 'collection' }),
    categories: [SchemaTypes.ObjectId({ ref: 'category' })],
    varieties: [SchemaTypes.ObjectId({ ref: 'variety' })],
    isReturnable: { type: Boolean, default: false },
    returnPeriod: { type: Number, default: 24 },
    purityComposition: [
      {
        metalGroup: SchemaTypes.ObjectId({ ref: 'metalGroup' }),
        name: String,
        weight: Number,
        purity: Number,
      },
    ],
    styleComposition: [
      {
        style: SchemaTypes.ObjectId({ ref: 'style' }),
        name: String,
        unit: {
          name: String,
          conversionFactor: Number,
        },
        rate: Number,
        rateAppliedOn: { type: String, enum: ['weight', 'piece'] },
        weight: Number,
        pieceCount: Number,
        size: String,
        clarity: String,
        color: String,
        cut: String,
        shape: String,
        certificate: String,
      },
    ],
    system: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('product', schema);

export default Product;
