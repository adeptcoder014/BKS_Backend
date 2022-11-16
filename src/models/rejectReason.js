import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: false,
    lowercase: false,
    trim: false,
    uniqueCaseInsensitive: true,
  },
});

const RejectReason = mongoose.model('rejectReason', schema);

export default RejectReason;
