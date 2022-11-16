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

    metalGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'metalGroup',
    },
  },
  {
    timestamps: true,
  }
);

const Style = mongoose.model('style', schema);

export default Style;
