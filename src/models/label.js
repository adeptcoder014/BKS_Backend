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

    style: {
      type: mongoose.Types.ObjectId,
      ref: 'style',
    },

    mode: {
      type: String,
      enum: ['weight', 'piece'],
    },

    weight: { type: Number },

    piece: { type: Number },
  },
  {
    timestamps: true,
  }
);

const Label = mongoose.model('label', schema);

export default Label;
