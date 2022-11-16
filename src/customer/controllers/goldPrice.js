import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { BuySell } from '../../models/index.js';
import { getGoldPrice } from '../../services/ecom.js';
import roundValue from '../../utils/roundValue.js';

export const getLatestGoldPrice = async (req, res) => {
  const [latest, recent] = await Promise.all([
    getGoldPrice(),
    BuySell.findOne().sort('-createdAt').skip(1),
  ]);

  const token = jwt.sign(latest, process.env.SECRET, {
    expiresIn: process.env.GOLD_PRICE_JWT_EXPIRY,
  });

  res.json({
    buyPrice: latest.buyPrice,
    sellPrice: latest.sellPrice,
    buyChange: roundValue(
      ((latest.buyPrice - recent?.buyPrice) / recent?.buyPrice) * 100
    ),
    sellChange: roundValue(
      ((latest.sellPrice - recent?.sellPrice) / recent?.sellPrice) * 100
    ),
    token,
  });
};

export const getPriceHistory = async (req, res) => {
  let field = {};
  let filter = {};
  let limit = 500;
  let from = req.query.from;
  let to = req.query.to;

  switch (req.query.period) {
    case 'hour': {
      filter = {
        createdAt: {
          $gte: dayjs().subtract(2, 'month').toDate(),
        },
      };
      field = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' },
        minute: {
          $subtract: [
            { $minute: '$createdAt' },
            { $mod: [{ $minute: '$createdAt' }, 10] },
          ],
        },
      };
      limit = 6;
      break;
    }

    case 'day': {
      filter = {
        createdAt: {
          $gte: dayjs().subtract(2, 'month').toDate(),
        },
      };
      field = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' },
      };
      limit = 24;
      break;
    }

    case 'month': {
      filter = {
        createdAt: {
          $gte: dayjs().subtract(1, 'month').toDate(),
        },
      };
      field = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
      limit = 30;
      break;
    }

    case 'year': {
      filter = {
        createdAt: {
          $gte: dayjs().subtract(1, 'year').toDate(),
        },
      };
      field = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      limit = 12;
      break;
    }

    case '5year': {
      filter = {
        createdAt: {
          $gte: dayjs().subtract(5, 'year').toDate(),
        },
      };

      field = {
        year: { $year: '$createdAt' },
      };
      limit = 5;
      break;
    }

    case 'all': {
      filter = {
        createdAt: {
          $gte: dayjs(new Date(1980, 1, 1)).toDate(),
        },
      };
      field = {
        year: { $year: '$createdAt' },
      };
      break;
    }

    default: {
      if (!from || !to) {
        return res.badRequest({
          message: `invalid period`,
        });
      }

      filter = {
        createdAt: {
          $gte: dayjs(from).toDate(),
          $lte: dayjs(to).toDate(),
        },
      };

      field = {
        year: { $year: '$createdAt' },
      };
      break;
    }
  }

  const [[average], data] = await Promise.all([
    BuySell.aggregate().group({
      _id: null,
      buyPrice: { $avg: '$buyPrice' },
      sellPrice: { $avg: '$sellPrice' },
    }),
    BuySell.aggregate()
      .match(filter)
      .project({
        field,
        buyPrice: 1,
        sellPrice: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .group({
        _id: '$field',
        buyPrice: { $first: '$buyPrice' },
        sellPrice: { $first: '$sellPrice' },
        date: { $first: '$createdAt' },
      })
      .sort({ date: -1 })
      .limit(parseInt(req.query.limit) || limit),
  ]);

  res.json({
    avgBuyPrice: roundValue(average.buyPrice, 0),
    avgSellPrice: roundValue(average.sellPrice, 0),
    data: data.reverse(),
    columns: ['1000', '2000', '3000', '4000', '5000', '6000', '7000'],
  });
};
