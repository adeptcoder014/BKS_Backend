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
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    code: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Supplier = mongoose.model('supplier', schema);

export default Supplier;
