import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      unique: false,
    },
  },
  {
    timestamps: true,
  }
);

const Badla = mongoose.model('badla', schema);

export default Badla;
