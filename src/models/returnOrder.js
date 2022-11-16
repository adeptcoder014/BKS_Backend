import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    orderId: String,
    docketNo: String,
    brnNo: String,
    trackingUrl: String,
    estimatedDeliveryDate: Date,
    otp: { type: String },
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    order: SchemaTypes.ObjectId({ ref: 'order' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
    captain: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
    shipFrom: {
      fullName: String,
      mobile: String,
      fullAddress: String,
      pincode: Number,
    },
    shipTo: {
      fullName: String,
      mobile: String,
      fullAddress: String,
      pincode: Number,
    },
    items: [
      {
        product: SchemaTypes.ObjectId({ ref: 'product' }),
        title: { type: String },
        image: SchemaTypes.S3,
        weight: Number,
        purity: String,
        quantity: Number,
        rate: Number,
        makingCharge: Number,
        tax: Number,
        taxAmount: Number,
        totalAmount: Number,
        returnedReason: String,
        captain: {
          isExists: Boolean,
          checkingVideo: SchemaTypes.S3,
          rejectedReason: String,
          status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
          },
        },
        manager: {
          isExists: Boolean,
          checkingVideo: SchemaTypes.S3,
          rejectedReason: String,
          status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
          },
        },
        checkingVideo: SchemaTypes.S3,
        rejectedReason: String,
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'refunded'],
          default: 'pending',
        },
      },
    ],
    packageImage: SchemaTypes.S3,
    openingVideo: SchemaTypes.S3,
    agentName: { type: String },
    agentImage: SchemaTypes.S3,
    agentDocument: SchemaTypes.S3,
    reorder: { type: mongoose.Types.ObjectId, ref: 'order' },
    isHandedOverToManager: { type: Boolean, default: false },
    receivedAt: Date,
    assignedAt: Date,
    checkedAt: Date,
    handedOverAt: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['placed', 'received', 'assigned', 'checked', 'completed'],
      default: 'placed',
    },
  },
  { timestamps: true }
);

const ReturnOrder = mongoose.model('returnOrder', schema);

export default ReturnOrder;
