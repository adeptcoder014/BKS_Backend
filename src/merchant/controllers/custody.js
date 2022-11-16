import User from '../../models/user.js';
import Custody from '../../models/custody.js';
import roundValue from '../../utils/roundValue.js';
import { parseDateFilter, stringToObjectId } from '../../utils/util.js';
import { getS3Url } from '../../services/s3.js';

export const getCustody = async (req, res) => {
  let { from, to, offset = 0, limit = 100, type, category, q } = req.query;

  const filter = {
    merchant: stringToObjectId(req.user.id),
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
      .match({
        ...filter,
        type: { $in: ['given', 'release'] },
      })
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
      }),
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
    given: roundValue(totals?.given ?? 0, 3),
    release: roundValue(totals?.release ?? 0, 3),
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
