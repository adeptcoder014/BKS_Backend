import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    app: {
      type: String,
      enum: ['customer', 'merchant', 'business', 'captain'],
    },
    category: { type: String },
    question: { type: String },
    answer: { type: String },
  },
  {
    timestamps: true,
  }
);

schema.index({ app: 1 });

const Faq = mongoose.model('faq', schema);

export default Faq;
