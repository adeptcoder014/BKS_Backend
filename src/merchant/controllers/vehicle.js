import Vehicle from '../../models/vehicle.js';
import APIError from '../../utils/error.js';

export const createVehicle = async (req, res) => {
  const data = new Vehicle(req.body);

  data.merchant = req.user.id;

  await data.save();

  res.status(201).json(data);
};

export const getVehicles = async (req, res) => {
  const filter = {
    merchant: req.user.id,
    deleted: false,
  };

  if (req.query.q) filter.number = new RegExp(req.query.q, 'i');
  if (req.query.status) filter.status = req.query.status;

  const data = await Vehicle.find(filter).lean({
    getters: true,
  });

  res.json(data);
};

export const getVehicleById = async (req, res) => {
  const data = await Vehicle.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });
  if (!data)
    throw new APIError(
      'vehicle does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json(data);
};

export const updateVehicle = async (req, res) => {
  const data = await Vehicle.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });
  if (!data)
    throw new APIError(
      'vehicle does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  Object.assign(data, req.body);

  await data.save();

  res.json(data);
};

export const deleteVehicle = async (req, res) => {
  await Vehicle.updateOne(
    { _id: req.params.id, merchant: req.user.id },
    { deleted: true }
  );
  res.json({
    message: 'success',
  });
};
