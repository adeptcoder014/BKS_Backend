import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    permissions: [String],

    code: {
      type: String,
    },

    weight: {
      type: Number,
    },

    parentRole: {
      type: mongoose.Types.ObjectId,
      ref: 'role',
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('role', schema);

export default Role;
