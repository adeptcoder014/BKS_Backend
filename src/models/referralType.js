import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ['customer', 'sales_offer', 'sales_associate', 'vip'],
    },
    referredBonus: {
      type: Number,
      default: 0,
    },
    joiningBonus: {
      min: Number,
      max: Number,
    },
    criteria: {
      type: String,
      enum: ['plan_maturity', 'download_subscriptions'],
    },
  },
  { timestamps: true }
);

const ReferralType = mongoose.model('referralType', schema);

export default ReferralType;
