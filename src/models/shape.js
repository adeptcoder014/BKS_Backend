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
  },
  {
    timestamps: true,
  }
);

const Shape = mongoose.model('shape', schema);

export default Shape;
