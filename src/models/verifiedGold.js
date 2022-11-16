import mongoose from 'mongoose';
import { generateQrCode, SchemaTypes } from '../utils/util.js';

const StyleSchema = new mongoose.Schema(
  {
    id: SchemaTypes.ObjectId({ generate: true }),
    style: SchemaTypes.ObjectId({ ref: 'style' }),
    weight: Number,
    pieceCount: Number,
    rate: Number,
    rateAppliedOn: {
      type: String,
      enum: ['weight', 'piece'],
    },
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    id: SchemaTypes.ObjectId({ generate: true }),
    name: String,
    image: SchemaTypes.S3,
    grossWeight: Number,
    grossPurity: Number,
    netWeight: Number,
    netPurity: Number,
    styles: [StyleSchema],
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    name: String,
    location: [Number],
    createdAt: Date,
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    qrCode: { type: String, unique: true, default: generateQrCode() },
    appointment: SchemaTypes.ObjectId({ ref: 'appointment' }),
    metalGroup: SchemaTypes.ObjectId({ ref: 'metalGroup' }),
    items: [ItemSchema],
    sellRate: Number,
    isDeclared: { type: Boolean, default: false },
    declarationTax: Number,
    declarationWeight: Number,
    uploadedGold: Number,
    amount: Number,
    otp: String,
    vehicle: SchemaTypes.ObjectId({ ref: 'vehicle' }),
    securityGuards: [SchemaTypes.ObjectId({ ref: 'securityGuard' })],
    beforeMelting: {
      grossWeight: Number,
      grossPurity: Number,
      netWeight: Number,
      netPurity: Number,
      styleAmount: Number,
    },
    bag: {
      id: SchemaTypes.ObjectId({ ref: 'securityBag' }),
      weight: Number,
      image: SchemaTypes.S3,
      video: SchemaTypes.S3,
    },
    merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
    captain: {
      id: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      qrCode: { type: String },
      bag: SchemaTypes.ObjectId({ ref: 'securityBag' }),
      bagWeight: Number,
      bagWeightScaleImage: SchemaTypes.S3,
      bagSealingVideo: SchemaTypes.S3,
      netWeight: Number,
      netPurity: Number,
      weightScaleImage: SchemaTypes.S3,
      purityScaleImage: SchemaTypes.S3,
    },
    manager: {
      id: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      qrCode: { type: String },
      bag: SchemaTypes.ObjectId({ ref: 'securityBag' }),
      bagWeight: Number,
      bagWeightScaleImage: SchemaTypes.S3,
      openingVideo: SchemaTypes.S3,
      purityCheckingVideo: SchemaTypes.S3,
      netWeight: Number,
      netPurity: Number,
      weightScaleImage: SchemaTypes.S3,
      purityScaleImage: SchemaTypes.S3,
    },
    refiner: {
      merchant: SchemaTypes.ObjectId({ ref: 'merchant' }),
      manager: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      captain: SchemaTypes.ObjectId({ ref: 'merchantUser' }),
      openingVideo: SchemaTypes.S3,
      purityCheckingVideo: SchemaTypes.S3,
      netWeight: Number,
      netPurity: Number,
      weightScaleImage: SchemaTypes.S3,
      purityScaleImage: SchemaTypes.S3,
    },
    events: [EventSchema],
    box: SchemaTypes.ObjectId({ ref: 'goldBox' }),
    refinedGold: SchemaTypes.ObjectId({ ref: 'refinedGold' }),
    assignedAt: Date,
    startedAt: Date,
    reachedAt: Date,
    meltedAt: Date,
    verifiedAt: Date,
    submittedAt: Date,
    checkedAt: Date,
    readyAt: Date,
    cancelledAt: Date,
    status: {
      type: String,
      enum: [
        'placed',
        'assigned',
        'started',
        'reached',
        'melted',
        'verified',
        'submitted',
        'checked',
        'ready',
        'refined',
        'cancelled',
      ],
    },
  },
  { timestamps: true }
);

const VerifiedGold = mongoose.model('verifiedGold', schema);

export default VerifiedGold;
