import APIError from '../../utils/error.js';
import UserWallet from '../../models/userWallet.js';

export const releaseUpload = async (req, res) => {
  const aggregated = await UserWallet.aggregate()
    .match({ user: req.user.id, source: 'old_gold' })
    .group({
      _id: null,
      weight: { $sum: 'uploaded.redeemable' },
    });

  const availableWeight = aggregated?.[0]?.weight || 0;

  if (req.body.weight > availableWeight)
    throw new APIError(`You can only request upto ${availableWeight} grams`);

  res.json({
    message: 'to be done',
  });
};
