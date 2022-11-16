import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    description: { type: String },
    gst: { type: Number },
  },
  { timestamps: true }
);

const Hsn = mongoose.model('hsn', schema);

export default Hsn;
