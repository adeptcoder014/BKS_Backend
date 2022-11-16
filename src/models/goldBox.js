import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    qrCode: { type: String, unique: true },
    itemType: {
      type: String,
      enum: ['verifiedGold', 'gold'],
    },
    orderId: { type: String },
    docketNo: { type: String },
    brnNo: { type: String },
    estimatedDeliveryDate: { type: Date },
    otp: String,
    bag: SchemaTypes.ObjectId({ ref: 'securityBag' }),
    items: [
      {
        type: mongoose.Types.ObjectId,
        refPath: 'itemType',
      },
    ],
    verifier: {
      merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
      manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      itemCount: Number,
      weight: Number,
      weightScaleImage: SchemaTypes.S3,
      agentName: String,
      agentImage: SchemaTypes.S3,
      agentDocument: SchemaTypes.S3,
    },
    refiner: {
      merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
      manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      captain: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      itemCount: Number,
      weight: Number,
      weightScaleImage: SchemaTypes.S3,
      openingVideo: SchemaTypes.S3,
      agentName: String,
      agentImage: SchemaTypes.S3,
      agentDocument: SchemaTypes.S3,
      packageImage: SchemaTypes.S3,
    },
    custodian: {
      merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
      manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      captain: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      packageImage: SchemaTypes.S3,
      openingVideo: SchemaTypes.S3,
      agentName: String,
      agentImage: SchemaTypes.S3,
      agentDocument: SchemaTypes.S3,
      packageImage: SchemaTypes.S3,
    },
    packedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    assignedAt: Date,
    checkedAt: Date,
    status: {
      type: String,
      enum: ['packed', 'shipped', 'delivered', 'assigned', 'checked'],
      default: 'packed',
    },
  },
  { timestamps: true }
);

const GoldBox = mongoose.model('goldBox', schema);

export default GoldBox;
