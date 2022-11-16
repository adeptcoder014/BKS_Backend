import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  mobile: String,
  otp: String,
  isWhatsapp: Boolean,
  isPrivacyAccepted: Boolean,
});

schema.index({ mobile: 1 });

const Otp = mongoose.model('otp', schema);

export default Otp;
