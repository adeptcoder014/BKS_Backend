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

    category: {
      type: String,
      enum: ['government_tax', 'tds', 'buy_save', 'interests'],
    },

    type: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    value: {
      type: Number,
      unique: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Calculation = mongoose.model('calculation', schema);

export default Calculation;
