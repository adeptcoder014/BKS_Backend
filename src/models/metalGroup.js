import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: String,

    shortName: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: false,
      uniqueCaseInsensitive: true,
    },

    purity: {
      type: Number,
      required: true,
      unique: false,
    },

    roundingDigits: {
      type: Number,
      required: true,
      unique: false,
    },

    metal: {
      type: mongoose.Types.ObjectId,
      ref: 'metal',
    },

    unit: {
      type: mongoose.Types.ObjectId,
      ref: 'unit',
    },

    ornament: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const MetalGroup = mongoose.model('metalGroup', schema);

export default MetalGroup;
