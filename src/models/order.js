import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    user: SchemaTypes.ObjectId({ ref: 'user' }),
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    parentOrder: SchemaTypes.ObjectId({ ref: 'parentOrder' }),
    items: [
      new mongoose.Schema(
        {
          title: { type: String },
          product: { type: mongoose.Types.ObjectId, ref: 'product' },
          image: SchemaTypes.S3,
          weight: Number,
          purity: String,
          quantity: Number,
          rate: Number,
          makingCharge: Number,
          tax: Number,
          taxAmount: Number,
          totalAmount: Number,
          beforeHandOver: {
            quantity: Number,
            weight: Number,
            weightScaleImage: SchemaTypes.S3,
            isReviewed: { type: Boolean, default: false },
          },
          afterHandOver: {
            quantity: Number,
            weight: Number,
            weightScaleImage: SchemaTypes.S3,
            isReviewed: { type: Boolean, default: false },
          },
        },
        { _id: false }
      ),
    ],
    buyRate: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    shipping: {
      address: Object,
      company: { type: String, default: 'sequel' },
      docketNo: String,
      brnNo: String,
      trackingUrl: String,
      estimatedDeliveryDate: Date,
    },
    captain: {
      otp: String,
      manager: { type: mongoose.Types.ObjectId, ref: 'merchantUser' },
      captain: { type: mongoose.Types.ObjectId, ref: 'merchantUser' },
      agentName: String,
      agentImage: SchemaTypes.S3,
      agentDocument: SchemaTypes.S3,
      invoiceImage: SchemaTypes.S3,
      packageImage: SchemaTypes.S3,
      openingVideo: SchemaTypes.S3,
      isStartedPacking: { type: Boolean, default: false },
      isHandedOverToManager: { type: Boolean, default: false },
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        'placed',
        'assigned',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
    },

    returnOrder: { type: mongoose.Types.ObjectId, ref: 'returnOrder' },

    isReturnOrder: { type: Boolean, default: false },

    invoice: SchemaTypes.S3,

    assignedAt: { type: Date },

    packedAt: { type: Date },

    shippedAt: { type: Date },

    cancelledAt: { type: Date },

    handedOverAt: { type: Date },

    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

schema.index({ orderId: 1 });
schema.index({ 'captain.captain': 1, status: 1 });
schema.index({ user: 1 });
schema.index({ status: 1 });

const Order = mongoose.model('order', schema);

export default Order;
