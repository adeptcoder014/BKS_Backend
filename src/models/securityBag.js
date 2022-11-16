import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    serialNumber: { type: String, unique: true },
    merchant: { type: mongoose.Types.ObjectId, ref: 'merchant' },
    manager: { type: mongoose.Types.ObjectId, ref: 'merchantUser' },
    captain: { type: mongoose.Types.ObjectId, ref: 'merchantUser' },
    status: {
      type: String,
      enum: ['available', 'used', 'destroyed'],
      default: 'available',
    },
  },
  { timestamps: true }
);

const SecurityBag = mongoose.model('securityBag', schema);

export default SecurityBag;
