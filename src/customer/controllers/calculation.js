import mongoose from 'mongoose';
import Calculation from '../../models/calculation.js';
import APIError from '../../utils/error.js';

export const getCalculations = async (req, res) => {
  const data = await Calculation.find().lean();
  res.json(data);
};

export const getCalculationById = async (req, res) => {
  const isObjectId = mongoose.isValidObjectId(req.params.id);

  const data = await Calculation.findOne({
    [isObjectId ? '_id' : 'name']: req.params.id,
  }).lean();

  if (!data) throw new APIError('calculation does not exist');
  res.json(data);
};
