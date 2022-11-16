import dayjs from 'dayjs';
import Custody from '../../models/custody.js';
import Invoice from '../../models/invoice.js';
import Order from '../../models/order.js';
import ReturnOrder from '../../models/returnOrder.js';
import Appointment from '../../models/appointment.js';
import GoldBox from '../../models/goldBox.js';
import Dispute from '../../models/dispute.js';
import roundValue from '../../utils/roundValue.js';
import { parseDateFilter, stringToObjectId } from '../../utils/util.js';
import RefinedGold from '../../models/refinedGold.js';
import Gold from '../../models/gold.js';
import APIError from '../../utils/error.js';
import Settlement from '../../models/settlement.js';

export const getCustodianOverview = async (req, res) => {
  const filter = {
    merchant: stringToObjectId(req.user.id),
    ...parseDateFilter(req.query.from, req.query.to),
  };

  const [data] = await Invoice.aggregate()
    .match({
      ...filter,
      type: { $in: ['sale', 'purchase'] },
    })
    .group({
      _id: null,
      revenue: {
        $sum: {
          $cond: [{ $eq: ['$type', 'sale'] }, '$settlementAmount', 0],
        },
      },
      due: {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: ['$type', 'purchase'] },
                { $ne: ['$status', 'settled'] },
              ],
            },
            '$settlementAmount',
            0,
          ],
        },
      },
    });

  const [custody] = await Custody.aggregate()
    .match(filter)
    .group({
      _id: null,
      given: {
        $sum: {
          $cond: [{ $eq: ['$type', 'given'] }, '$weight', 0],
        },
      },
      release: {
        $sum: {
          $cond: [{ $eq: ['$type', 'release'] }, '$weight', 0],
        },
      },
    });

  res.json({
    revenue: roundValue(data?.revenue ?? 0),
    due: roundValue(data?.due ?? 0),
    custodyGiven: roundValue(custody?.given ?? 0, 3),
    custodyRelease: roundValue(custody?.release ?? 0, 3),
  });
};

export const getEcomOverview = async (req, res) => {
  const filter = {
    merchant: stringToObjectId(req.user.id),
    type: 'sale',
    module: 'ecom',
    ...parseDateFilter(req.query.from, req.query.to),
  };

  const [[revenue], [orders], [returnOrders]] = await Promise.all([
    Invoice.aggregate()
      .match(filter)
      .group({
        _id: null,
        amount: { $sum: '$settlementAmount' },
      }),
    Order.aggregate()
      .match({
        merchant: req.user.id,
        ...parseDateFilter(req.query.from, req.query.to),
      })
      .group({
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'placed'] }, 1, 0],
          },
        },
        delivered: {
          $sum: {
            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
          },
        },
        cancelled: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
          },
        },
      }),
    ReturnOrder.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        ...parseDateFilter(req.query.from, req.query.to),
      })
      .group({
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'placed'] }, 1, 0],
          },
        },
        refunds: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
        returned: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
          },
        },
      }),
  ]);

  res.json({
    revenue: roundValue(revenue?.amount ?? 0),
    refunded: 0,
    orders: {
      active: orders?.active ?? 0,
      delivered: orders?.delivered ?? 0,
      cancelled: orders?.cancelled ?? 0,
    },
    returnOrders: {
      active: returnOrders?.active ?? 0,
      refunds: returnOrders?.refunds ?? 0,
      returned: returnOrders?.returned ?? 0,
    },
  });
};

export const getVerifierOverview = async (req, res) => {
  const filter = {
    merchant: stringToObjectId(req.user.id),
    ...parseDateFilter(req.query.from, req.query.to),
  };

  const [[data], [appointments], [refinery], disputes] = await Promise.all([
    Invoice.aggregate()
      .match({
        ...filter,
        type: { $in: ['advance', 'commission'] },
        category: { $in: ['verification', 'verification_cancelled'] },
      })
      .group({
        _id: null,
        verifiedRevenue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'advance'] }, '$settlementAmount', 0],
          },
        },
        cancelledRevenue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'advance'] }, '$settlementAmount', 0],
          },
        },
      }),
    Appointment.aggregate()
      .match(filter)
      .group({
        _id: null,
        active: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  ['requested', 'reschedule_requested', 'booked'],
                ],
              },
              1,
              0,
            ],
          },
        },
        verified: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
        cancelled: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
          },
        },
      }),
    GoldBox.aggregate()
      .match({
        itemType: 'verifiedGold',
        'verifier.merchant': stringToObjectId(req.user.id),
        ...parseDateFilter(req.query.from, req.query.to),
      })
      .group({
        _id: null,
        shipped: {
          $sum: {
            $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0],
          },
        },
        delivered: {
          $sum: {
            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
          },
        },
      }),
    Dispute.countDocuments({
      merchant: req.user.id,
    }),
  ]);

  res.json({
    verifiedRevenue: roundValue(data?.verifiedValue ?? 0),
    cancelledRevenue: roundValue(data?.cancelledRevenue ?? 0),
    verifications: {
      active: appointments?.active ?? 0,
      verified: appointments?.verified ?? 0,
      cancelled: appointments?.cancelled ?? 0,
    },
    refinery: {
      shipped: refinery?.shipped ?? 0,
      delivered: refinery?.delivered ?? 0,
      disputes,
    },
  });
};

export const getRefinerOverview = async (req, res) => {
  const filter = parseDateFilter(req.query.from, req.query.to);

  const [revenueData, refinery, melting, bars, disputes] = await Promise.all([
    Invoice.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        type: 'commission',
        category: 'refinery',
        ...filter,
      })
      .group({
        _id: null,
        revenue: {
          $sum: '$settlementAmount',
        },
      }),
    GoldBox.aggregate()
      .match({
        'refiner.merchant': stringToObjectId(req.user.id),
        ...filter,
      })
      .group({
        _id: null,
        active: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$itemType', 'verifiedGold'] },
                  { $in: ['$status', ['delivered', 'assigned']] },
                ],
              },
              1,
              0,
            ],
          },
        },
        verified: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$itemType', 'verifiedGold'] },
                  { $eq: ['$status', 'checked'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        shipped: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$itemType', 'gold'] },
                  { $eq: ['$status', 'shipped'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        delivered: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$itemType', 'gold'] },
                  { $eq: ['$status', 'delivered'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      }),
    RefinedGold.aggregate()
      .match(filter)
      .group({
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'started'] }, 1, 0],
          },
        },
        melted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'refined'] }, 1, 0],
          },
        },
      }),
    Gold.countDocuments({
      merchant: req.user.id,
      type: 'bar',
      status: 'checked',
    }),
    Dispute.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        ...parseDateFilter,
      })
      .group({
        _id: null,
        byCaptain: {
          $sum: {
            $cond: [{ $eq: ['$itemType', 'verifiedGold'] }, 1, 0],
          },
        },
        byManager: {
          $sum: {
            $cond: [{ $eq: ['$itemType', 'gold'] }, 1, 0],
          },
        },
      }),
  ]);

  res.json({
    revenue: roundValue(revenueData[0]?.revenue ?? 0),
    refinery: {
      active: refinery[0]?.active ?? 0,
      verified: refinery[0]?.verified ?? 0,
      disputes: disputes[0]?.byCaptain ?? 0,
    },
    melting: {
      active: melting[0]?.active ?? 0,
      melted: melting[0]?.melted ?? 0,
      bars: bars,
    },
    hub: {
      shipped: refinery[0]?.shipped ?? 0,
      delivered: refinery[0]?.delivered ?? 0,
      disputes: disputes[0]?.byManager ?? 0,
    },
  });
};

export const getRevenue = async (req, res) => {
  const { from, to, offset, limit, category } = req.query;

  const filter = {
    merchant: req.user.id,
    type: {
      $in: ['sale', 'commission', 'advance'],
    },
    ...parseDateFilter(from, to),
  };

  switch (category) {
    case 'all':
      filter.type = {
        $in: ['sale', 'commission', 'advance'],
      };
      break;
    case 'gold':
      filter.type = 'sale';
      filter.category = 'custody';
      break;
    case 'commission':
      filter.type = 'commission';
      break;
    case 'verification_cancelled':
      filter.type = 'advance';
      filter.category = 'verification_cancelled';
      break;
  }

  const [data] = await Invoice.aggregate()
    .match(filter)
    .group({
      _id: null,
      revenue: {
        $sum: '$settlementAmount',
      },
      data: {
        $push: {
          id: '$_id',
          category: '$category',
          amount: '$settlementAmount',
          description: {
            $first: '$items.description',
          },
          weight: {
            $first: '$items.quantity',
          },
          createdAt: '$createdAt',
        },
      },
    });

  res.json({
    revenue: roundValue(data?.revenue ?? 0),
    data: data?.data ?? [],
  });
};

export const getSales = async (req, res) => {
  const { from, to, offset, limit, q, status } = req.query;

  const query = Invoice.find({
    type: 'sale',
    merchant: req.user.id,
    ...parseDateFilter(from, to),
  });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (q) query.where({ invoiceId: new RegExp(q, 'i') });

  switch (status) {
    case 'all':
      break;
    case 'settled':
      query.where({
        status: 'settled',
      });
      break;
    case 'unsettled':
    case 'due':
      query.where({
        status: 'paid',
      });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.items[0].description,
      weight: item.items[0].quantity,
      amount: item.settlementAmount,
      createdAt: item.createdAt,
      status: item.status === 'paid' ? 'unsettled' : 'settled',
    }))
  );
};

export const getPurchases = async (req, res) => {
  const { from, to, offset, limit, q, status } = req.query;

  const query = Invoice.find({
    type: 'purchase',
    merchant: req.user.id,
    ...parseDateFilter(from, to),
  });

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);
  if (q) query.where({ invoiceId: new RegExp(q, 'i') });

  switch (status) {
    case 'all':
      break;
    case 'due':
      query.where({ status: 'paid' });
      break;
    case 'settled':
      query.where({ status: 'settled' });
      break;
  }

  const data = await query.lean();

  res.json(
    data.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.items[0].description,
      weight: item.items[0].quantity,
      amount: item.settlementAmount,
      createdAt: item.createdAt,
      status: item.status === 'paid' ? 'unsettled' : 'settled',
    }))
  );
};

export const getInvoiceById = async (req, res) => {
  const data = await Invoice.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  })
    .populate('user')
    .populate('settlement');

  if (!data) throw new APIError('invoice does not exist', 404);

  res.json({
    id: data.id,
    invoiceId: data.invoiceId,
    invoiceUrl: data.document.customerCopy,
    certificateUrl: data.certificate.customerCopy,
    amount: data.settlementAmount,
    customerName: data.user.fullName,
    items: data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })),
    createdAt: data.createdAt,
    dueDate: data.createdAt,
    settledAt: data.settlement?.settledAt ?? '',
    status: data.status === 'paid' ? 'unsettled' : 'settled',
  });
};

export const settleSales = async (req, res) => {};

export const settlePurchases = async (req, res) => {
  const data = await Invoice.find({
    _id: req.body.ids,
    type: 'purchase',
  });

  let amount = 0;

  for (const item of data) {
    if (item.status !== 'paid')
      throw new APIError(`invoice ${item.invoiceId} is invalid`);
    amount += item.settlementAmount;
  }

  amount = roundValue(amount);

  if (req.body.amount !== amount) throw new APIError('Invalid amount');

  const settlement = new Settlement({
    type: 'incoming',
    invoices: data.map((invoice) => invoice.id),
    merchant: req.user.id,
    amount,
    transactionDetails: {
      id: req.body.transactionId,
      mode: req.body.transactionMode,
      amount,
      bank: req.body.bank,
      date: req.body.transactionDate,
    },
    status: 'processing',
  });

  await settlement.save();
  await Invoice.updateMany(
    { _id: data.map((e) => e.id) },
    { settlement: settlement.id, status: 'processing' }
  );

  res.status(201).json({
    message: 'success',
  });
};
