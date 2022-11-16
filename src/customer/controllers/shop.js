import Business from '../../models/business.js';
import { getS3Url } from '../../services/s3.js';
import APIError from '../../utils/error.js';

const MAX_DISTANCE = 1000 * 10;

export const getShops = async (req, res) => {
  if (!req.query.location && !req.user.location)
    throw new APIError('location is required');

  const data = await Business.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates:
            req.query.location.split(',') || req.user.location?.coordinates,
        },
        $maxDistance: MAX_DISTANCE,
      },
    },
  })
    .lean()
    .select('name address mobile location');

  res.json(
    data.map((item) => ({
      id: item.id,
      name: item.name,
      image: getS3Url(item.image),
      address: item.address?.fullAddress ?? ' ',
      location: item.location?.coordinates,
    }))
  );
};
