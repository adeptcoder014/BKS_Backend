import CyclePeriod from '../../models/cyclePeriod.js';
import APIError from '../../utils/error.js';

export const getCyclePeriods = async (req, res) => {
  const data = await CyclePeriod.find().lean();
  res.json(data);
};

export const getCyclePeriodById = async (req, res) => {
  const data = await CyclePeriod.findById(req.params.id).lean();
  if (!data)
    throw new APIError(
      'cyclePeriod does not exist',
      APIError.RESOURCE_NOT_FOUND
    );

  res.json(data);
};
