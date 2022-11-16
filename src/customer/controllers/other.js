import {
  Category,
  Variety,
  Item,
  Slider,
  Offer,
  Faq,
  Interest,
  Policy,
  Video,
  ReturnReason,
  MetalGroup,
  Merchant,
} from '../../models/index.js';

export const getMetalGroups = async (req, res) => {
  const data = await MetalGroup.find();
  res.json(data);
};

export const getCategories = async (req, res) => {
  const data = await Category.find();
  res.json(data);
};

export const getVarieties = async (req, res) => {
  const data = await Variety.find();
  res.json(data);
};

export const getItems = async (req, res) => {
  const data = await Item.find();
  res.json(data);
};

export const getSliders = async (req, res) => {
  const data = await Slider.find().populate('typeId');
  res.json(data);
};

export const getOffers = async (req, res) => {
  const data = await Offer.find().populate('typeId');
  res.json(data);
};

export const getFaqs = async (req, res) => {
  const data = await Faq.find().lean();
  res.json(data);
};

export const getInterests = async (req, res) => {
  const data = await Interest.find().lean();
  res.json(data);
};

export const getPolicies = async (req, res) => {
  const data = await Policy.find().lean();
  res.json(data);
};

export const getVideos = async (req, res) => {
  const data = await Video.find();
  res.json(data);
};

export const getReasons = async (req, res) => {
  const data = await ReturnReason.find({ type: req.query.type }).lean();
  res.json(data);
};

export const getBrands = async (req, res) => {
  const data = await Merchant.find({ image: { $exists: true } });

  res.json(data.map((item) => item.image));
};
