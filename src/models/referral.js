import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Types.ObjectId, ref: 'user' },
    referee: { type: mongoose.Types.ObjectId, ref: 'user' },
    subscription: { type: mongoose.Types.ObjectId, ref: 'subscription' },
  },
  { timestamps: true }
);

schema.index({ referrer: 1 });
schema.index({ referee: 1 });

const Referral = mongoose.model('referral', schema);

export default Referral;
