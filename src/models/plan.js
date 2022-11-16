import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    mode: {
      type: String,
      enum: ['weight', 'value'],
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    type: {
      type: String,
      enum: ['standard', 'flexi'],
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    min: { type: Number },

    duration: { type: Number },

    cyclePeriod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cyclePeriod',
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ type: 1 }, { name: 'type' });
schema.index({ cyclePeriod: 1 }, { name: 'cyclePeriod' });

const Plan = mongoose.model('plan', schema);

export default Plan;
