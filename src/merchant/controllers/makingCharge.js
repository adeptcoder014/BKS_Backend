import MakingCharge from '../../models/makingCharge.js';
import APIError from '../../utils/error.js';

export const createMakingCharge = async (req, res) => {
  const data = new MakingCharge({
    ...req.body,
    merchant: req.user.id,
  });

  await data.save();

  res.status(201).json(data);
};

export const getMakingCharges = async (req, res) => {
  const data = await MakingCharge.find({
    merchant: req.user.id,
    isDeleted: false,
  }).populate(['variety', 'item', 'metalGroup', 'productType']);

  res.json(data);
};

export const getMakingChargeById = async (req, res) => {
  const data = await MakingCharge.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  }).populate(['variety', 'item', 'metalGroup', 'productType']);

  if (!data)
    throw new APIError(
      'MakingCharge does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json(data);
};

export const updateMakingCharge = async (req, res) => {
  const data = await MakingCharge.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError(
      'MakingCharge does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  Object.assign(data, req.body);

  await data.save();

  res.json(data);
};

export const deleteMakingCharge = async (req, res) => {
  const data = await MakingCharge.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError(
      'MakingCharge does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  data.isDeleted = true;

  await data.save();

  res.json({
    message: 'success',
  });
};
