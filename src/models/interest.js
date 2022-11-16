import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['reserve', 'loan', 'upload'],
    },
    minMonth: { type: Number },
    maxMonth: { type: Number },
    value: { type: Number },
  },
  { timestamps: true }
);

const Interest = mongoose.model('interest', schema);

export default Interest;
