import Hsn from '../../models/hsn.js';
import {
  Category,
  Certificate,
  Clarity,
  Collection,
  Color,
  Cut,
  Item,
  MetalGroup,
  Product,
  ProductType,
  Shape,
  Style,
  Variety,
} from '../../models/index.js';
import { getProductsPrice, populateProduct } from '../../services/ecom.js';
import APIError from '../../utils/error.js';

export const createProduct = async (req, res) => {
  const data = new Product(req.body);

  data.type = req.body.productType;
  data.merchant = req.user.id;
  data.collectionId = req.body.collection;

  await populateProduct(data);
  await data.save();

  res.status(201).json(data);
};

export const getProducts = async (req, res) => {
  const data = await getProductsPrice({
    merchant: req.user.id,
    isDeleted: false,
  });
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
  const [data] = await getProductsPrice(
    {
      merchant: req.user.id,
      _id: req.params.id,
    },
    { populate: ['merchant'] }
  );
  if (!data)
    throw new APIError(
      'product does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  res.json(data);
};

export const updateProduct = async (req, res) => {
  const data = await Product.findOne({
    _id: req.params.id,
    merchant: req.user.id,
  });
  if (!data)
    throw new APIError(
      'product does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  Object.assign(data, req.body, {
    collectionId: req.body.collection,
  });

  await populateProduct(data);
  await data.save();

  res.json(data);
};

export const deleteProduct = async (req, res) => {
  await Product.updateOne(
    { _id: req.params.id, merchant: req.user.id },
    { isDeleted: true }
  );
  res.json({
    message: 'success',
  });
};

export const getData = async (req, res) => {
  const fields = 'name shortName purity ornament';

  const [
    productTypes,
    categories,
    collections,
    metalGroups,
    styles,
    clarities,
    colors,
    cuts,
    shapes,
    varieties,
    items,
    certificates,
  ] = await Promise.all([
    ProductType.find({ merchant: req.user.id }).lean().select(fields),
    Category.find().lean().select(fields),
    Collection.find().lean().select(fields),
    MetalGroup.find().lean().select(fields),
    Style.find().lean().select(fields),
    Clarity.find().lean().select(fields),
    Color.find().lean().select(fields),
    Cut.find().lean().select(fields),
    Shape.find().lean().select(fields),
    Variety.find().lean().select(fields),
    Item.find().lean().select(fields),
    Certificate.find().lean().select(fields),
  ]);

  res.json({
    productTypes,
    categories,
    collections,
    metalGroups,
    styles,
    clarities,
    colors,
    cuts,
    shapes,
    varieties,
    items,
    certificates,
  });
};

export const getHsnCodes = async (req, res) => {
  const query = Hsn.find({});

  if (req.query.q) {
    query.where({ code: new RegExp(req.query.q, 'i') });
  }

  const data = await query.lean();

  res.json(data);
};

export const getCollections = async (req, res) => {
  const data = await Collection.find({
    name: new RegExp(req.query.q, 'i'),
  })
    .lean()
    .limit(20);

  res.json(
    data.map((item) => ({
      id: item.id,
      name: item.name,
    }))
  );
};
