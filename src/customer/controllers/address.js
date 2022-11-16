import Address from '../../models/address.js';
import APIError from '../../utils/error.js';
import { isPincodeServiceable } from '../../services/logistic.js';

export const getAddresses = async (req, res) => {
  const data = await Address.find({ user: req.user.id }).lean();
  res.json(data);
};

export const getAddressById = async (req, res) => {
  const data = await Address.findById(req.params.id).lean();
  if (!data)
    throw new APIError(
      'Address does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json(data);
};

export const createAddress = async (req, res) => {
  const data = await Address.create({
    ...req.body,
    user: req.user.id,
    location: {
      type: 'Point',
      coordinates: req.body.location,
    },
  });
  res.status(201).json(data);
};

export const updateAddress = async (req, res) => {
  const data = await Address.findOne({ _id: req.params.id, user: req.user.id });
  if (!data)
    throw new APIError('address does not exist', APIError.RESOURCE_NOT_FOUND);

  Object.assign(data, req.body);

  if (req.body.location) {
    data.location = {
      type: 'Point',
      coordinates: req.body.location,
    };
  }

  await data.save();

  res.json(data);
};

export const setPrimaryAddress = async (req, res) => {
  await Address.updateMany(
    { user: req.user.id },
    {
      isPrimary: false,
    }
  );

  await Address.updateOne(
    { _id: req.params.id, user: req.user.id },
    {
      isPrimary: true,
    }
  );

  res.status(201).json({
    message: 'success',
  });
};

export const getServiceableStatus = async (req, res) => {
  const address = await Address.findById(req.params.id).lean();
  if (!address)
    throw new APIError(
      'Address does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const [error, data] = await isPincodeServiceable(address.pincode);

  res.json({
    available: error ? false : true,
    data: data ?? null,
  });
};

export const deleteAddress = async (req, res) => {
  const data = await Address.deleteOne({
    _id: req.params.id,
    user: req.user.id,
  });
  res.status(204).json(data);
};
