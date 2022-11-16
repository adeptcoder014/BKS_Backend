import mongoose from 'mongoose';
import { SchemaTypes } from '../utils/util.js';

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },

    items: [
      {
        _id: false,
        product: SchemaTypes.ObjectId({ ref: 'product' }),
        quantity: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('cart', schema);

export default Cart;
