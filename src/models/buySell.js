import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    buyPrice: Number,
    sellPrice: Number,
  },
  { timestamps: true }
);

schema.index({ createdAt: 1 });

const BuySell = mongoose.model('buySell', schema);

export default BuySell;
