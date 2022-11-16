import dayjs from 'dayjs';
import Payment from '../../models/payment.js';
import Appointment from '../../models/appointment.js';
import Merchant from '../../models/merchant.js';
import MerchantUser from '../../models/merchantUser.js';
import razorpay from '../../services/razorpay.js';
import { generateOrderId } from '../../utils/util.js';
import { getCalculation } from '../../services/application.js';
import {
  MODULE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../utils/constants.js';
import Transaction from '../../models/transaction.js';
import Invoice from '../../models/invoice.js';

export const createAppointment = async (req, res) => {
  const amount = await getCalculation('booking_amount');

  const merchant = await Merchant.findOne({
    modules: 'verifier',
    isVerified: true,
  }).lean();
  const manager = await MerchantUser.findOne({
    merchant: merchant?.id,
    status: 'active',
  }).lean();

  if (!merchant || !manager)
    throw new APIError('No verifier available right now');

  const appointment = new Appointment({
    orderId: generateOrderId(),
    type: req.body.type,
    user: req.user.id,
    weight: req.body.weight,
    metalGroup: req.body.metalGroup,
    address: req.body.address,
    custodian: process.env.MERCHANT_ID,
    merchant: merchant.id,
    manager: manager.id,
    amountPaid: amount,
    requestedDate: dayjs(
      `${req.body.date} ${req.body.time}`,
      'DD/MM/YYYY hh:mm A'
    ),
    lastScheduledBy: 'user',
    status: 'requested',
  });

  const order = await razorpay.orders.create({
    amount: appointment.amountPaid,
  });

  const payment = await Payment.create({
    orderId: order.id,
    user: req.user.id,
    amount: appointment.amountPaid,
    module:
      appointment.type === 'sell'
        ? MODULE.SELL_OLD_GOLD
        : MODULE.UPLOAD_OLD_GOLD,
    data: appointment,
    status: 'pending',
  });

  res.status(201).json({
    orderId: order.id,
    amount,
    callbackUrl: `/payments/${payment.id}`,
  });
};

export const processCreateAppointment = async (data, user) => {
  const date = new Date();
  const pdf =
    'https://bks-gold.s3.ap-south-1.amazonaws.com/invoices/a5d88fd4f3404aed80ab67a9c';

  const appointment = new Appointment(data.data);

  await appointment.populate('metalGroup');

  const transaction = new Transaction({
    type: TRANSACTION_TYPE.CREDIT,
    module:
      appointment.type === 'sell'
        ? MODULE.SELL_OLD_GOLD
        : MODULE.UPLOAD_OLD_GOLD,
    payment: data.id,
    amount: appointment.amountPaid,
    user: user.id,
    invoiceUrl: pdf,
    status: TRANSACTION_STATUS.COMPLETED,
    createdAt: date,
  });

  const invoice = new Invoice({
    type: 'advance',
    category: 'receipt',
    module: transaction.module,
    merchant: appointment.merchant,
    user: user.id,
    items: [
      {
        description: 'Verification Booking',
        quantity: 1,
        rate: appointment.amountPaid,
        amount: appointment.amountPaid,
        tax: 0,
        taxAmount: 0,
        totalAMount: appointment.amountPaid,
      },
    ],
    tax: 0,
    taxAmount: 0,
    totalAmount: appointment.amountPaid,
    createdAt: date,
    documentUrl: pdf,
    certificateUrl: pdf,
    document: {
      originalCopy: pdf,
      customerCopy: pdf,
    },
    certificate: {
      originalCopy: pdf,
      customerCopy: pdf,
    },
    status: 'pending',
  });

  await appointment.save();
  await transaction.save();
  await invoice.save();

  return {
    weight: appointment.weight,
    metalPurity: appointment.metalGroup.shortName,
    appointmentDate: appointment.requestedDate,
    amountPaid: appointment.amountPaid,
    receipt: pdf,
  };
};
