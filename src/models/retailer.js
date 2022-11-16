import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const schema = new mongoose.Schema(
  {
    fullName: String,
    company: String,
    type: { type: String, enum: ['jewellery', 'commodity'] },
    image: String,
    password: String,
    mpin: String,
    gstNo: String,
    settlementInDays: Number,
    eInvoiceApplicable: { type: Boolean, default: false },
    isWhatsapp: { type: Boolean, default: false },
    isPrivacyAccepted: { type: Boolean, default: false },
    deviceToken: String,
    commission: {
      buy: { type: Number, default: 0 },
      sell: { type: Number, default: 0 },
    },
    address: {
      address1: String,
      address2: String,
      city: String,
      state: String,
      pincode: String,
    },
    location: {
      type: pointSchema,
      required: true,
      index: '2dsphere',
    },
  },
  { timestamps: true }
);

const Retailer = mongoose.model('retailer', schema);

export default Retailer;
