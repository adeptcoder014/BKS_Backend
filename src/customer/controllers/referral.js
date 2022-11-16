import dayjs from 'dayjs';
import { ReferredUser, Referral } from '../../models/index.js';
import APIError from '../../utils/error.js';

export const getReferralInfo = async (req, res) => {
  const data = await Referral.findOne({ user: req.user.id }).lean();
  if (!data)
    throw new APIError(
      'referral does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );
  res.json(data);
};

export const getReferredUsers = async (req, res) => {
  const data = await ReferredUser.find({ referredBy: req.user.id })
    .lean()
    .populate({
      path: 'user',
      select: 'fullName createdAt',
      options: { lean: true },
    })
    .populate({
      path: 'subscription',
      options: { lean: true },
    });

  const getPaymentStatus = (subscription) => {
    if (!subscription) return 'SUBSCRIPTION NOT TAKEN';
    const currentDate = dayjs();
    const dueDate = dayjs(subscription.dueDate);

    if (subscription.status === 'completed') return 'COMPLETED';
    if (subscription.status === 'forfeited') return 'FORFEITED';
    if (currentDate.isBefore(dueDate)) return 'ALREADY PAID';
    if (currentDate.isAfter(dueDate)) return 'PAYMENT IS DUE';
  };

  res.json(
    data.map((item) => ({
      id: item.id,
      fullName: item.user?.fullName,
      paymentDate:
        item.subscription?.status === 'running'
          ? item.subscription.dueDate
          : null,
      paymentStatus: getPaymentStatus(item.subscription),
    }))
  );
};

export const remindUsers = async (req, res) => {
  const data = await ReferredUser.find({ _id: req.body.ids })
    .lean()
    .populate({
      path: 'user',
      select: 'fullName email mobile deviceToken isWhatsapp',
    })
    .populate({
      path: 'subscription',
    });

  for (const item of data) {
    const user = item.user;
    const subscription = item.subscription;

    if (!subscription || subscription === 'completed') {
      continue;
    }
  }

  res.status(201).json({
    message: 'success',
  });
};
