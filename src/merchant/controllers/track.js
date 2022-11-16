import Appointment from '../../models/appointment.js';
import VerifiedGold from '../../models/verifiedGold.js';
import RefinedGold from '../../models/refinedGold.js';
import GoldBox from '../../models/goldBox.js';
import Gold from '../../models/gold.js';
import { parseDateFilter, stringToObjectId } from '../../utils/util.js';
import roundValue from '../../utils/roundValue.js';

export const getRequests = async (req, res) => {
  const { from, to, offset, limit, status, analytics } = req.query;

  const filter = {
    merchant: req.user.id,
    ...parseDateFilter(from, to),
  };

  const query = Appointment.find(filter).populate([
    'user',
    'address',
    'merchant',
  ]);

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  switch (status) {
    case 'in_process':
      query.where({ status: 'booked' });
      break;
    case 'completed':
      query.where({ status: 'completed' });
      break;
  }

  const finalData = { analytics: null };
  const data = await query.lean();

  if (analytics === 'true' && status === 'completed') {
    const [aggregated] = await VerifiedGold.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        status: 'verified',
        ...parseDateFilter(from, to),
      })
      .group({
        _id: null,
        weight: {
          $sum: '$captain.netWeight',
        },
        purity: {
          $avg: '$captain.netPurity',
        },
        payout: {
          $sum: '$amount',
        },
        sellGold: {
          $sum: {
            $cond: [{ $eq: ['$type', 'sell'] }, '$captain.netWeight', 0],
          },
        },
        uploadGold: {
          $sum: {
            $cond: [{ $eq: ['$type', 'upload'] }, '$captain.netWeight', 0],
          },
        },
        taxableGold: {
          $sum: '$declarationWeight',
        },
      });

    finalData.analytics = {
      weight: roundValue(aggregated?.weight ?? 0, 3),
      purity: roundValue(aggregated?.purity ?? 0),
      payout: roundValue(aggregated?.payout ?? 0),
      sellGold: roundValue(aggregated?.sellGold ?? 0, 3),
      uploadGold: roundValue(aggregated?.uploadGold ?? 0, 3),
      taxableGold: roundValue(aggregated?.taxableGold ?? 0, 3),
    };
    finalData.analytics.fineWeight = roundValue(
      (finalData.analytics.weight * finalData.analytics.purity) / 100,
      3
    );
  }

  finalData.data = data.map((item) => ({
    id: item.verifiedGold,
    orderId: item.orderId,
    type: item.type,
    customerName: item.user.fullName,
    area: item.address?.area || 'Kondapur',
    city: item.address?.district || 'Hyderabad',
    state: item.address?.state || 'TS',
    scheduledDate: item.scheduledDate || item.requestedDate,
    verifierName: item.merchant.name,
    status: item.status,
  }));

  res.json(finalData);
};

export const getVerifierOrders = async (req, res) => {
  const { from, to, offset, limit, status, analytics } = req.query;

  const filter = {
    merchant: req.user.id,
    ...parseDateFilter(from, to),
  };

  switch (status) {
    case 'in_process':
      filter.status = {
        $in: ['placed', 'assigned', 'started', 'reached', 'melted'],
      };
      break;
    case 'completed':
      filter.status = 'verified';
      break;
  }

  const query = VerifiedGold.find(filter)
    .populate('box')
    .populate('merchant')
    .populate({
      path: 'appointment',
      populate: ['user', 'address'],
    })
    .lean();

  if (offset) query.skip(offset);
  if (limit) query.limit(limit);

  const finalData = { analytics: null };

  if (analytics === 'true') {
    const [aggregated] = await VerifiedGold.aggregate()
      .match({
        merchant: stringToObjectId(req.user.id),
        status: 'verified',
        ...parseDateFilter(from, to),
      })
      .group({
        _id: null,
        weight: {
          $sum: {
            $cond: [
              { $isNumber: '$manager.netWeight' },
              '$manager.netWeight',
              '$captain.netWeight',
            ],
          },
        },
        purity: {
          $avg: {
            $cond: [
              { $isNumber: '$manager.netPurity' },
              '$manager.netPurity',
              '$captain.netPurity',
            ],
          },
        },
        payout: {
          $sum: '$amount',
        },
        sellGold: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'sell'] },
              {
                $cond: [
                  { $isNumber: '$manager.netWeight' },
                  '$manager.netWeight',
                  '$captain.netWeight',
                ],
              },
              0,
            ],
          },
        },
        uploadGold: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'upload'] },
              {
                $cond: [
                  { $isNumber: '$manager.netWeight' },
                  '$manager.netWeight',
                  '$captain.netWeight',
                ],
              },
              0,
            ],
          },
        },
        taxableGold: {
          $sum: '$declarationWeight',
        },
        differenceWeight: {
          $sum: {
            $cond: [
              { $isNumber: '$manager.netWeight' },
              { $subtract: ['$captain.netWeight', '$manager.netWeight'] },
              0,
            ],
          },
        },
      });

    finalData.analytics = {
      weight: roundValue(aggregated?.weight ?? 0, 3),
      purity: roundValue(aggregated?.purity ?? 0),
      payout: roundValue(aggregated?.payout ?? 0),
      sellGold: roundValue(aggregated?.sellGold ?? 0, 3),
      uploadGold: roundValue(aggregated?.uploadGold ?? 0, 3),
      taxableGold: roundValue(aggregated?.taxableGold ?? 0, 3),
      differenceWeight: roundValue(aggregated?.differenceWeight ?? 0, 3),
    };
    finalData.analytics.fineWeight = roundValue(
      (finalData.analytics.weight * finalData.analytics.purity) / 100,
      3
    );
  }

  const data = await query;

  finalData.data = data.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    type: item.appointment?.type,
    customerName: item.appointment?.user?.fullName,
    area: item.appointment?.address?.area,
    city: item.appointment?.address?.district,
    state: item.appointment?.address?.state,
    scheduledDate:
      item.appointment?.scheduledDate || item.appointment?.requestedDate,
    verifierName: item.merchant.name,
    status: item.status,
  }));

  res.json(finalData);
};
