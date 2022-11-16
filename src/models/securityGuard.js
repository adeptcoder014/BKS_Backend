import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    fullName: String,
    merchant: { type: mongoose.Types.ObjectId, ref: 'merchant' },
    addedBy: { type: mongoose.Types.ObjectId, ref: 'merchantUser' },
  },
  { timestamps: true }
);

schema.index({ merchant: 1 });

schema.index({ name: 1, merchant: 1 });

const SecurityGuard = mongoose.model('securityGuard', schema);

export default SecurityGuard;
