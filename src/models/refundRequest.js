import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: 'user' },
    account: { type: mongoose.Types.ObjectId, ref: 'account' },
    order: { type: mongoose.Types.ObjectId, ref: 'order' },
    products: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'product',
      },
    ],
    gold: { type: Number },
    buyRate: { type: Number },
    amount: { type: Number },
    balance: { type: Number },
    history: [
      {
        order: { type: mongoose.Types.ObjectId, ref: 'order' },
        amount: Number,
        createdAt: Date,
      },
    ],
    expiresAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'processing', 'used', 'completed', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

schema.index({ user: 1 });

const RefundRequest = mongoose.model('refundRequest', schema);

export default RefundRequest;
