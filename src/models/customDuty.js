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

    value: {
      type: Number,
      unique: false,
      required: true,
    },

    surcharge: { type: Number },
  },
  {
    timestamps: true,
  }
);

const CustomDuty = mongoose.model('customDuty', schema);

export default CustomDuty;
