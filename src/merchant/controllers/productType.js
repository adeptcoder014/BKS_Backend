import ProductType from '../../models/productType.js';
import APIError from '../../utils/error.js';

export const createProductType = async (req, res) => {
  const data = new ProductType({
    ...req.body,
    merchant: req.user.id,
  });

  await data.save();

  res.status(201).json(data);
};

export const getProductTypes = async (req, res) => {
  const data = await ProductType.find({
    merchant: req.user.id,
    isDeleted: false,
  });

  res.json(data);
};

export const getProductTypeById = async (req, res) => {
  const data = await ProductType.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError(
      'productType does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json(data);
};

export const updateProductType = async (req, res) => {
  const data = await ProductType.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError(
      'productType does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  Object.assign(data, req.body);

  await data.save();

  res.json(data);
};

export const deleteProductType = async (req, res) => {
  const data = await ProductType.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });

  if (!data)
    throw new APIError(
      'productType does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  data.isDeleted = true;

  await data.save();

  res.json({
    message: 'success',
  });
};
