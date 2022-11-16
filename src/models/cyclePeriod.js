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

    shortName: {
      type: String,
    },

    cycle: {
      type: Number,
      required: true,
      unique: false,
    },

    gracePeriod: {
      type: Number,
      required: true,
      unique: false,
    },

    maxSkip: {
      type: Number,
      default: 2,
    },

    maxUnpaidSkip: {
      type: Number,
      default: 1,
    },

    maxUnpaidInvestment: {
      type: Number,
      default: 1,
    },

    lockInPeriod: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const CyclePeriod = mongoose.model('cyclePeriod', schema);

export default CyclePeriod;
