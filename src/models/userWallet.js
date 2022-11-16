import mongoose from 'mongoose';

const common = {
  redeemable: { type: Number, default: 0 },
  hold: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
};

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: 'user' },
    merchant: { type: mongoose.Types.ObjectId, ref: 'merchant' },
    ...common,
    instant: common,
    buySave: common,
    buySaveBonus: common,
    sellReserve: common,
    uploaded: common,
    referral: common,
  },
  { timestamps: true }
);

schema.statics.updateGold = function ({ userId, merchantId, data, session }) {
  const increment = data;

  for (const field in data) {
    const [first, last] = field.split('.');

    if (last) {
      increment[`${first}.total`] =
        (increment[`${first}.total`] ?? 0) + data[field];
    } else {
      increment.total = (increment.total ?? 0) + data[field];
    }
  }
  return this.findOneAndUpdate(
    { user: userId, merchant: merchantId },
    {
      $inc: increment,
    },
    { upsert: true, new: true, session }
  );
};

const UserWallet = mongoose.model('userWallet', schema);

export default UserWallet;
