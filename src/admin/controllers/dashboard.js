import dayjs from 'dayjs';
import Order from '../../models/order.js';
import BuySell from '../../models/buySell.js';
import ReturnOrder from '../../models/returnOrder.js';
import User from '../../models/user.js';
import Merchant from '../../models/merchant.js';
import Business from '../../models/business.js';
import Custody from '../../models/custody.js';
import Invoice from '../../models/invoice.js';
import Settlement from '../../models/settlement.js';
import Commission from '../../models/commission.js';
import { calculateDiff, parseDateFilter } from '../../utils/util.js';
import { runReports } from '../../services/analytics.js';
import roundValue from '../../utils/roundValue.js';

const parseDates = (query) => {
  const startDate = dayjs(query.from, 'DD/MM/YYYY');
  const endDate = dayjs(query.to, 'DD/MM/YYYY');

  return {
    current: { startDate, endDate },
    previous: {
      startDate: startDate.subtract(endDate.diff(startDate, 'day') + 1, 'day'),
      endDate: startDate.subtract(1, 'day'),
    },
  };
};

export const getAppAnalytics = async (req, res) => {
  const { current, previous } = parseDates(req.query);
  const format = 'YYYY-MM-DD';

  const [reports, orderCount, currentRate, averageRate] = await Promise.all([
    runReports([
      {
        metrics: [{ name: 'screenPageViews' }, { name: 'conversions' }],
        dimensions: [{ name: 'date' }],
        dateRanges: [
          {
            startDate: current.startDate.format(format),
            endDate: current.endDate.format(format),
          },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: 'date',
            },
          },
        ],
        metricAggregations: ['TOTAL'],
      },
      {
        metrics: [{ name: 'screenPageViews' }, { name: 'conversions' }],

        dateRanges: [
          {
            startDate: previous.startDate.format(format),
            endDate: previous.endDate.format(format),
          },
        ],
      },
    ]),
    Order.countDocuments(),
    BuySell.find().sort('-createdAt').limit(2),
    BuySell.aggregate()
      .match({
        createdAt: {
          $gte: dayjs().startOf('day').toDate(),
          $lte: dayjs().toDate(),
        },
      })
      .group({
        _id: null,
        buyRate: { $avg: '$buyPrice' },
        sellRate: { $avg: '$sellPrice' },
      }),
  ]);

  res.json({
    visits: {
      value: reports[0].totals[0].metricValues?.[0].value ?? 0,
      change:
        calculateDiff(
          reports[1].rows?.[0].metricValues?.[0].value ?? 0,
          reports[0].totals?.[0].metricValues?.[0].value ?? 0,

          false
        ) ?? 0,
      data:
        reports[0].rows?.map((e) => e.metricValues?.[0].value)?.flat() ?? [],
    },
    downloads: {
      value: 35,
      change: 2,
      data: [2, 6, 10, 4, 14, 10, 20],
    },
    conversions: {
      value: reports[0].totals[0].metricValues?.[1].value ?? 0,
      change:
        calculateDiff(
          reports[1].rows?.[0].metricValues?.[1].value ?? 0,
          reports[0].totals?.[0].metricValues?.[1].value ?? 0,

          false
        ) ?? 0,
      data: reports[0].rows?.map((e) => e.metricValues?.[1].value).flat() ?? [],
    },
    orders: {
      value: orderCount,
      change: 5,
      data: [10, 20, 30, 40, 30, 50, 70],
    },
    currentBuyRate: {
      value: currentRate[0].buyPrice,
      change: calculateDiff(
        currentRate[0].buyPrice,
        currentRate[1].buyPrice,
        false
      ),
      updatedAt: currentRate[0].createdAt,
    },
    currentSellRate: {
      value: currentRate[0].sellPrice,
      change: calculateDiff(
        currentRate[0].sellPrice,
        currentRate[1].sellPrice,
        false
      ),
      updatedAt: currentRate[0].createdAt,
    },
    averageBuyRate: averageRate[0]?.buyRate ?? currentRate[0].buyPrice,
    averageSellRate: averageRate[0]?.sellRate ?? currentRate[0].sellPrice,
  });
};

export const getOrdersAnalytics = async (req, res) => {
  const [orders, returnOrders, accepted, rejected] = await Promise.all([
    Order.aggregate()
      .match(parseDateFilter(req.query.from, req.query.to))
      .group({ _id: '$status', count: { $sum: 1 } }),
    ReturnOrder.aggregate()
      .match(parseDateFilter(req.query.from, req.query.to))
      .group({ _id: '$status', count: { $sum: 1 } }),
    ReturnOrder.countDocuments({ 'items.status': 'accepted' }),
    ReturnOrder.countDocuments({ 'items.status': 'rejected' }),
  ]);

  res.json({
    orders: orders.reduce(
      (prev, item) => {
        prev.total += item.count;

        switch (item._id) {
          case 'placed':
            prev.toBePacked += item.count;
            break;
          case 'packed':
            prev.toBeShipped += item.count;
            break;
          case 'shipped':
            prev.inTransit += item.count;
            break;
          case 'delivered':
            prev.delivered += item.count;
            break;
          case 'cancelled':
            prev.cancelled += item.count;
            break;
        }

        return prev;
      },
      {
        total: 0,
        toBePacked: 0,
        toBeShipped: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
      }
    ),
    returns: returnOrders.reduce(
      (prev, item) => {
        prev.total += item.count;
        prev.accepted = accepted;
        prev.rejected = rejected;

        switch (item._id) {
          case 'placed':
            prev.toBePicked += item.count;
            break;
          case 'received':
            prev.toBeReceived += item.count;
            break;
        }

        return prev;
      },
      { total: 0, toBePicked: 0, toBeReceived: 0, accepted: 0, rejected: 0 }
    ),
  });
};

export const getPeopleAnalytics = async (req, res) => {
  const { current, previous } = parseDates(req.query);

  let model = User;

  switch (req.query.type) {
    case 'customer':
      model = User;
      break;
    case 'merchant':
      model = Merchant;
      break;
    case 'business':
      model = Business;
      break;
    case 'referral':
      model = User;
      break;
  }
  const [currentValue, previousValue, data] = await Promise.all([
    model.countDocuments({
      createdAt: {
        $gte: current.startDate.startOf('day').toDate(),
        $lte: current.endDate.endOf('day').toDate(),
      },
    }),
    model.countDocuments({
      createdAt: {
        $gte: previous.startDate.startOf('day').toDate(),
        $lte: previous.endDate.endOf('day').toDate(),
      },
    }),
    model
      .aggregate()
      .match({
        createdAt: {
          $gte: current.startDate.startOf('day').toDate(),
          $lte: current.endDate.startOf('day').toDate(),
        },
      })
      .group({
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        date: { $first: '$createdAt' },
        count: { $sum: 1 },
      }),
  ]);

  res.json({
    currentValue,
    previousValue,
    change: calculateDiff(previousValue, currentValue),
    data: data.map((e) => e.count),
  });
};

export const getCustodyAnalytics = async (req, res) => {
  const date = dayjs(req.query.year, 'YYYY');

  const data = await Custody.aggregate()
    .match({
      createdAt: {
        $gte: date.startOf('year').toDate(),
        $lte: date.endOf('year').toDate(),
      },
    })
    .group({
      _id: { $month: '$createdAt' },
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

  const finalData = {
    given: [],
    release: [],
  };

  for (let i = 1; i < 13; i++) {
    const monthData = data.find((item) => item._id === i);

    finalData.given.push(roundValue(monthData?.given ?? 0, 0));
    finalData.release.push(roundValue(monthData?.release ?? 0, 0));
  }

  res.json(finalData);
};

export const getSalePurchaseAnalytics = async (req, res) => {
  const filter = parseDateFilter(req.query.from, req.query.to);

  const [totals] = await Invoice.aggregate()
    .match(filter)
    .group({
      _id: null,
      sale: {
        $sum: {
          $cond: [{ $eq: ['$type', 'sale'] }, '$totalAmount', 0],
        },
      },
      purchase: {
        $sum: {
          $cond: [{ $eq: ['$type', 'purchase'] }, '$totalAmount', 0],
        },
      },
    });

  const data = await Invoice.aggregate()
    .match({
      createdAt: {
        $gte: dayjs().subtract(5, 'month').toDate(),
      },
    })
    .group({
      _id: {
        $month: '$createdAt',
      },
      date: { $first: '$createdAt' },
      sale: {
        $sum: {
          $cond: [{ $eq: ['$type', 'sale'] }, '$totalAmount', 0],
        },
      },
      purchase: {
        $sum: {
          $cond: [{ $eq: ['$type', 'purchase'] }, '$totalAmount', 0],
        },
      },
    });

  res.json({
    sales: roundValue(totals?.sale ?? 0, 0),
    purchases: roundValue(totals?.purchase ?? 0, 0),
    data: data.map((item) => ({
      label: dayjs(item.date).format('MMM'),
      date: dayjs(item.date).startOf('month').format('DD/MM/YYYY'),
      sale: roundValue(item.sale, 0),
      purchase: roundValue(item.purchase, 0),
    })),
  });
};

export const getReceivableAnalytics = async (req, res) => {
  const filter = {
    type: 'incoming',
    ...parseDateFilter(req.query.from, req.query.to),
  };

  const [totals] = await Settlement.aggregate()
    .match(filter)
    .group({
      _id: null,
      value: { $sum: '$amount' },
    });

  const data = await Settlement.aggregate()
    .match({
      type: 'incoming',
      createdAt: {
        $gte: dayjs().subtract(5, 'month').toDate(),
      },
    })
    .group({
      _id: {
        $month: '$createdAt',
      },
      date: { $first: '$createdAt' },
      value: { $sum: '$amount' },
    });

  res.json({
    value: roundValue(totals?.value ?? 0, 0),
    data: data.map((item) => ({
      label: dayjs(item.date).format('MMM'),
      date: dayjs(item.date).startOf('month').format('DD/MM/YYYY'),
      value: roundValue(item.value, 0),
    })),
  });
};

export const getSettlementAnalytics = async (req, res) => {
  const filter = {
    type: 'outgoing',
    ...parseDateFilter(req.query.from, req.query.to),
  };

  const [totals] = await Settlement.aggregate()
    .match(filter)
    .group({
      _id: null,
      value: { $sum: '$amount' },
    });

  const data = await Settlement.aggregate()
    .match({
      type: 'outgoing',
      createdAt: {
        $gte: dayjs().subtract(5, 'month').toDate(),
      },
    })
    .group({
      _id: {
        $month: '$createdAt',
      },
      date: { $first: '$createdAt' },
      value: { $sum: '$amount' },
    });

  res.json({
    value: roundValue(totals?.value ?? 0, 0),
    data: data.map((item) => ({
      label: dayjs(item.date).format('MMM'),
      date: dayjs(item.date).startOf('month').format('DD/MM/YYYY'),
      value: roundValue(item.value, 0),
    })),
  });
};

export const getCommissionAnalytics = async (req, res) => {
  const filter = parseDateFilter(req.query.from, req.query.to);

  const [totals] = await Commission.aggregate()
    .match(filter)
    .group({
      _id: null,
      value: { $sum: '$amount' },
    });

  const data = await Commission.aggregate()
    .match({
      createdAt: {
        $gte: dayjs().subtract(5, 'month').toDate(),
      },
    })
    .group({
      _id: {
        $month: '$createdAt',
      },
      date: { $first: '$createdAt' },
      value: { $sum: '$amount' },
    });

  res.json({
    value: roundValue(totals?.value ?? 0, 0),
    data: data.map((item) => ({
      label: dayjs(item.date).format('MMM'),
      date: dayjs(item.date).startOf('month').format('DD/MM/YYYY'),
      value: roundValue(item.value, 0),
    })),
  });
};
