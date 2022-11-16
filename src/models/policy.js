import mongoose from 'mongoose';

const policyTypes = [
  'privacy',
  'terms',
  'shipping',
  'cancellation',
  'return',
  'refund',
];

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, enum: policyTypes },
    description: { type: String, required: true },
    consignmentRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Policy = mongoose.model('policy', schema);

export default Policy;
