import crypto from 'crypto';
import { Payment } from '../../models/index.js';
import razorpay from '../../services/razorpay.js';
import { MODULE, PAYMENT_STATUS } from '../../utils/constants.js';
import roundValue from '../../utils/roundValue.js';
import { processCreateAppointment } from './appointment.js';
import { processInstantGoldBuy } from './instantGold.js';
import { processCreateOrder } from './order.js';
import { processBuyReserved } from './reserve.js';
import { processCreateSubscription } from './subscription.js';

const bypass = process.env.PAYMENT_BYPASS === 'true';

export const receivePayment = async (req, res) => {
  const [payment, data] = await Promise.all([
    razorpay.payments.fetch(req.body.razorpay_payment_id),
    Payment.findById(req.params.id),
  ]);

  if (!data) {
    return res.status(400).json({ message: 'payment order not found' });
  }

  if (data.status === 'completed') {
    return res.status(400).json({ message: 'payment is already processed' });
  }

  const body = `${data.orderId}|${req.body.razorpay_payment_id}`;
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (req.body.razorpay_signature !== signature && !bypass)
    return res.sendStatus(400);

  data.userData = req.user;
  data.mode = payment.method;
  data.paymentId = req.body.razorpay_payment_id || 'bypassed';
  data.payment = payment;

  let fn;

  switch (data.module) {
    case MODULE.INSTANT:
      fn = processInstantGoldBuy;
      break;

    case MODULE.BUY_RESERVE:
      fn = processBuyReserved;
      break;

    case MODULE.SELL_OLD_GOLD:
    case MODULE.UPLOAD_OLD_GOLD:
      fn = processCreateAppointment;
      break;

    case MODULE.BUY_SAVE:
      fn = processCreateSubscription;
      break;

    case MODULE.ECOM:
      fn = processCreateOrder;
      break;

    default:
      res.status(400).json({ message: 'payment not handled blame me' });
      return;
  }

  const resData = await fn(data, req.user);

  await Payment.updateOne(
    { _id: data.id },
    {
      method: payment.method,
      fee: roundValue(payment.fee / 100, 2),
      gst: roundValue(payment.tax / 100, 2),
      paidAt: new Date(payment.created_at),
      status: PAYMENT_STATUS.PAID,
    }
  );

  res.status(201).json(resData);
};
