import RazorPay from 'razorpay';
import roundValue from '../utils/roundValue.js';

const razorpay = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = razorpay.orders.create;

razorpay.orders.create = (options) => {
  const amount = roundValue(options.amount * 100);
  return createOrder({
    ...options,
    amount,
  });
};

export default razorpay;
