import dayjs from 'dayjs';
import Invoice from '../models/invoice.js';
import Merchant from '../models/merchant.js';
import Settlement from '../models/settlement.js';
import Custody from '../models/custody.js';
import Commission from '../models/commission.js';
import User from '../models/user.js';
import { generateInvoice } from '../services/pdf.js';
import { convertCurrency, generateOrderId } from '../utils/util.js';
import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import roundValue from '../utils/roundValue.js';

export default async function (job, done) {
  const merchant = await Merchant.findById(job.data.merchantId);
  const user = await User.findById(job.data.userId);

  const commissionAmount = roundValue(
    job.data.totalAmount * (merchant.commission.buy / 100)
  );
  const settlementAmount = roundValue(job.data.totalAmount + commissionAmount);

  const invoiceId = generateOrderId();

  const [invoicePdf, certificatePdf] = await Promise.all([
    generateInvoice('invoices/purchase', {
      invoiceId,
      merchant: {
        name: merchant.name,
        address: merchant.address.address,
        pan: merchant.pan,
        adhaar: merchant.aadhaar,
        cin: merchant.cin,
      },
      seller: {
        name: user.fullName,
        mobile: user.mobile,
        email: user.email,
      },
      item: job.data.item,
      totalAmount: job.data.totalAmount,
      totalAmountInWords: convertCurrency(job.data.totalAmount),
      date: dayjs(job.data.date).format('DD/MM/YYYY'),
    }),
    generateInvoice('invoices/custodyRelease', {
      merchant: {
        name: merchant.name,
        address: merchant.address.address,
        pan: merchant.pan,
        gstin: merchant.gstNo,
        cin: merchant.cin,
      },
      certificateTo: {
        name: user.fullName,
        mobile: user.mobile,
        email: user.email,
      },
      item: job.data.item,
      weightInWords: job.data.item.quantity,
      createdAt: dayjs(job.data.date).format('DD/MM/YYYY'),
    }),
  ]);

  const invoice = new Invoice({
    invoiceId,
    type: 'purchase',
    user: user.id,
    merchant: merchant.id,
    module: job.data.module,
    transaction: job.data.transactionId,
    documentUrl: invoicePdf.key,
    certificateUrl: certificatePdf.key,
    document: {
      originalCopy: invoicePdf.key,
      customerCopy: invoicePdf.key,
    },
    certificate: {
      originalCopy: certificatePdf.key,
      customerCopy: certificatePdf.key,
    },
    items: [job.data.item],
    tax: job.data.tax,
    taxAmount: job.data.taxAmount,
    totalAmount: job.data.totalAmount,
    status: 'pending',
  });

  const settlement = new Settlement({
    type: 'incoming',
    invoice: invoice.id,
    merchant: invoice.merchant,
    amount: settlementAmount,
    status: 'processing',
  });

  const commission = new Commission({
    invoice: invoice.id,
    amount: commissionAmount,
    status: 'pending',
  });

  invoice.settlement = settlement.id;
  invoice.commission = commission.id;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async (session) => {
      await invoice.save({ session });
      await commission.save({ session });
      await settlement.save({ session });
      await Custody.updateOne(
        { _id: job.data.custodyId },
        { invoice: invoice.id },
        { session }
      );
      await Transaction.updateOne(
        { _id: job.data.transactionId },
        {
          invoiceUrl: invoicePdf.key,
          certificateUrl: certificatePdf.key,
        },
        { session }
      );
    });
    done();
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await session.endSession();
  }
}
