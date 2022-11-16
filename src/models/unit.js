import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    symbol: String,

    conversionFactor: {
      type: Number,
      unique: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Unit = mongoose.model('unit', schema);

export default Unit;
