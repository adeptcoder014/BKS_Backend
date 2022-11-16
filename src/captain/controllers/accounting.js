import Custody from '../../models/custody.js';
import Invoice from '../../models/invoice.js';
import User from '../../models/user.js';
import { getS3Url } from '../../services/s3.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';
import { parseDateFilter, stringToObjectId } from '../../utils/util.js';

export const getOverview = async (req, res) => {
  const { from, to } = req.query;

  const [invoices, custodies] = await Promise.all([
    Invoice.aggregate()
      .match({
        merchant: stringToObjectId(req.user.merchant),
        ...parseDateFilter(from, to),
      })
      .project({ type: 1 })
      .group({ _id: '$type', count: { $sum: 1 } }),
    Custody.aggregate()
      .match({
        merchant: stringToObjectId(req.user.merchant),
        ...parseDateFilter(from, to),
      })
      .project({ type: 1 })
      .group({ _id: '$type', count: { $sum: 1 } }),
  ]);

  const invoice = invoices.reduce(
    (prev, item) => {
      prev[item._id] += item.count;
      return prev;
    },
    { sale: 0, purchase: 0, advance: 0, commission: 0, service: 0 }
  );

  const custody = custodies.reduce(
    (prev, item) => {
      prev[item._id] += item.count;
      return prev;
    },
    { given: 0, release: 0 }
  );

  res.json({
    sale: invoice.sale,
    purchase: invoice.purchase,
    custodyGiven: custody.given,
    custodyRelease: custody.release,
    advance: invoice.advance,
    commission: invoice.commission,
    service: invoice.service,
  });
};

export const getSaleInvoices = async (req, res) => {
  const { from, to, status, offset, limit } = req.query;

  const filter = {
    type: 'sale',
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  switch (status) {
    case 'all':
      break;
    case 'unsettled':
      filter.status = 'paid';
      break;
    case 'settled':
      filter.status = 'settled';
      break;
  }

  const [aggregated] = await Invoice.aggregate()
    .match(filter)
    .group({ _id: null, amount: { $sum: '$settlementAmount' } });

  const data = await Invoice.find(filter, {}, { offset, limit }).transform(
    (docs) =>
      docs.map((item) => ({
        id: item.id ?? item._id,
        invoiceId: item.invoiceId,
        title: item.items[0].description,
        amount: item.Amount,
        date: item.createdAt,
        status: item.status === 'paid' ? 'unsettled' : 'settled',
      }))
  );

  res.json({
    amount: roundValue(aggregated?.amount ?? 0),
    data,
  });
};

export const getPurchaseInvoices = async (req, res) => {
  const { from, to, category, offset, limit } = req.query;

  const filter = {
    type: 'purchase',
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  switch (category) {
    case 'all':
      break;
    case 'old_gold':
      filter.category = 'old_gold';
      break;
    case 'custody_gold':
      filter.category = 'custody';
      break;
  }

  const [aggregated] = await Invoice.aggregate()
    .match(filter)
    .group({ _id: null, amount: { $sum: '$settlementAmount' } });

  const data = await Invoice.find(filter, {}, { offset, limit }).transform(
    (docs) =>
      docs.map((item) => ({
        id: item.id ?? item._id,
        invoiceId: item.invoiceId,
        title: item.items[0].description,
        category: item.category,
        amount: item.settlementAmount,
        date: item.createdAt,
        status: item.status === 'paid' ? 'unsettled' : 'settled',
      }))
  );

  res.json({
    amount: roundValue(aggregated?.amount ?? 0),
    data,
  });
};

export const getAdvanceInvoices = async (req, res) => {
  const { from, to, category, offset, limit } = req.query;

  const filter = {
    type: 'advance',
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  switch (category) {
    case 'all':
      break;
    case 'receipt':
      filter.category = 'receipt';
      break;
    case 'refund':
      filter.category = 'refund';
      break;
  }

  const [aggregated] = await Invoice.aggregate()
    .match(filter)
    .group({ _id: null, amount: { $sum: '$settlementAmount' } });

  const data = await Invoice.find(filter, {}, { offset, limit })
    .populate('user')
    .transform((docs) =>
      docs.map((item) => ({
        id: item.id ?? item._id,
        invoiceId: item.invoiceId,
        invoiceUrl: item.document.customerCopy,
        image: item.user.image ?? '',
        category: item.category,
        amount: item.settlementAmount,
        date: item.createdAt,
      }))
    );

  res.json({
    amount: roundValue(aggregated?.amount ?? 0),
    data,
  });
};

export const getCommissionInvoices = async (req, res) => {
  const { from, to, category, offset, limit } = req.query;

  const filter = {
    type: 'commission',
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  switch (category) {
    case 'all':
      break;
    case 'refinery':
      filter.category = 'refinery';
      break;
    case 'verifier':
      filter.category = 'verifier';
      break;
  }

  const [aggregated] = await Invoice.aggregate()
    .match(filter)
    .group({ _id: null, amount: { $sum: '$settlementAmount' } });

  const data = await Invoice.find(filter, {}, { offset, limit })
    .populate('user')
    .transform((docs) =>
      docs.map((item) => ({
        id: item.id ?? item._id,
        invoiceId: item.invoiceId,
        invoiceUrl: item.document.customerCopy,
        image: item.user.image ?? '',
        category: item.category,
        amount: item.settlementAmount,
        date: item.createdAt,
      }))
    );

  res.json({
    amount: roundValue(aggregated?.amount ?? 0),
    data,
  });
};

export const getServiceInvoices = async (req, res) => {
  const { from, to, offset, limit } = req.query;

  const filter = {
    type: 'commission',
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  const [aggregated] = await Invoice.aggregate()
    .match(filter)
    .group({ _id: null, amount: { $sum: '$settlementAmount' } });

  const data = await Invoice.find(filter, {}, { offset, limit })
    .populate('user')
    .transform((docs) =>
      docs.map((item) => ({
        id: item.id ?? item._id,
        invoiceId: item.invoiceId,
        invoiceUrl: item.document.customerCopy,
        title: item.items[0].description,
        image: item.user.image ?? '',
        category: item.category,
        amount: item.settlementAmount,
        date: item.createdAt,
      }))
    );

  res.json({
    amount: roundValue(aggregated?.amount ?? 0),
    data,
  });
};

export const getInvoiceById = async (req, res) => {
  const data = await Invoice.findById(req.params.id)
    .populate('user')
    .lean({ getters: true });
  if (!data)
    throw new APIError(
      'invoice does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    id: data.id,
    invoiceId: data.invoiceId,
    amount: data.settlementAmount,
    fullName: data.user.fullName,
    invoiceDate: data.createdAt,
    invoiceUrl: data.document.customerCopy,
    dueDate: data.createdAt,
    items: data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })),
    status: data.status === 'paid' ? 'unsettled' : 'settled',
  });
};

export const getCustody = async (req, res) => {
  let { from, to, offset = 0, limit = 100, type, category, q } = req.query;

  const filter = {
    merchant: stringToObjectId(req.user.merchant),
    ...parseDateFilter(from, to),
  };

  switch (type) {
    case 'given':
      filter.type = 'given';
      break;
    case 'release':
      filter.type = 'release';
      break;
  }

  switch (category) {
    case 'all':
      break;
    case 'buy_gold':
      filter.module = { $in: ['instant', 'subscription '] };
      break;
    case 'sell_gold':
      filter.module = 'instant';
      break;
    case 'upload_gold':
      filter.module = 'upload';
      break;
  }

  const users =
    q &&
    (await User.find({ fullName: new RegExp(q, 'gi') })
      .select('_id')
      .limit(50));

  if (users) filter.user = { $in: users.map((e) => e._id) };
  if (!offset) offset = 0;
  if (!limit) limit = 100;

  const [[totals], data] = await Promise.all([
    Custody.aggregate()
      .match(filter)
      .group({ _id: null, weight: { $sum: '$weight' } }),
    Custody.aggregate()
      .match(filter)
      .skip(offset)
      .limit(limit)
      .group({
        _id: '$user',
        weight: { $sum: '$weight' },
      })
      .lookup({
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'users',
      }),
  ]);

  res.json({
    weight: roundValue(totals?.weight ?? 0, 3),
    data: data.map((item) => ({
      id: item.users[0]?._id,
      fullName: item.users[0]?.fullName,
      image: getS3Url(item.users[0]?.image) ?? '',
      weight: item.weight,
    })),
  });
};

export const getCustodyByUser = async (req, res) => {
  const { offset, limit, from, to, type } = req.query;

  const query = Custody.find({
    type,
    user: req.params.id,
    ...parseDateFilter(from, to),
  }).populate('invoice');

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  const data = await query.lean({ getters: true });

  res.json(
    data.map((item) => ({
      id: item.id,
      invoiceId: item.invoice.invoiceId,
      invoiceUrl: item.invoice.document.customerCopy,
      certificateUrl: item.invoice.certificate.customerCopy,
      date: item.invoice.createdAt,
    }))
  );
};
