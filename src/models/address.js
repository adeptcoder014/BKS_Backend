import mongoose from 'mongoose';
import Location from './location.js';

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },

    addressType: { type: String },

    address: { type: String },

    landmark: { type: String },

    area: { type: String },

    district: { type: String },

    state: { type: String },

    pincode: { type: Number },

    location: Location,

    isPrimary: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

schema.methods.format = function () {
  return {
    fullAddress: this.address,
    area: this.area,
    district: this.district,
    state: this.state,
    pincode: this.pincode,
    location: this.location,
  };
};

const Address = mongoose.model('address', schema);

export default Address;
