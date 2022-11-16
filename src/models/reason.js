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

  type: {
    type: String,
    enum: ['return', 'cancel'],
  },
});

const Reason = mongoose.model('reason', schema);

export default Reason;
