import omitBy from 'lodash/omitBy.js';
import Product from '../../models/product.js';
import Address from '../../models/address.js';
import { getProductsPrice } from '../../services/ecom.js';
import APIError from '../../utils/error.js';
import { getDeliveryStatus } from '../../services/logistic.js';

export const getProducts = async (req, res) => {
  const { offset, limit, sortBy, ...query } = req.query;
  const filter = {};
  const options = { skip: offset, limit, sort: {} };

  switch (sortBy) {
    case 'hot':
      options.sort['purchaseCount'] = -1;
      break;
    case 'new':
      options.sort['createdAt'] = -1;
      break;
  }

  if (query.category) filter.categories = query.category;
  if (query.variety) filter.varieties = query.variety;
  if (query.item) filter.item = query.item;

  const data = await getProductsPrice(
    {
      system: false,
      ...filter,
    },
    options
  );

  res.json(
    data.map((item, i) => ({
      id: item.id,
      title: item.title,
      image: item.images[0],
      stock: item.stock,
      price: item.pricing.total,
    }))
  );
};

export const getProductById = async (req, res) => {
  const data = await getProductsPrice(
    { _id: req.params.id },
    { populate: ['merchant'] }
  );

  if (!data[0])
    throw new APIError(
      'product does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json({
    ...data[0],
  });

  Product.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } }).exec();
};

export const getProductDeliveryStatus = async (req, res) => {
  const [data, address] = await Promise.all([
    Product.findById(req.params.id).lean().populate('merchant'),
    Address.findOne({ _id: req.params.addressId, user: req.user.id }),
  ]);

  if (!data)
    throw new APIError(
      'product does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  if (!address)
    throw new APIError(
      'address does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const shippingData = await getDeliveryStatus(
    data.merchant.address.pincode,
    address.pincode
  );

  res.json(shippingData);
};
