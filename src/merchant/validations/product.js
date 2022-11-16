import joi from 'joi';
import validators from '../../utils/validators.js';

export const createProduct = joi.object({
  productType: validators.id().required(),
  metalGroup: validators.id().required(),
  item: validators.id().required(),
  collection: joi.string().required(),
  categories: joi.array().items(validators.id()).required(),
  varieties: joi.array().items(validators.id()).required(),
  grossWeight: joi.number().required(),
  stock: joi.number().required(),
  images: joi.array().items(validators.fileKey()).min(1).required(),
  video: validators.fileKey(),
  hsn: validators.id().required(),
  huid: joi.string(),
  sku: joi.string(),
  description: joi.string(),
  height: joi.string(),
  length: joi.string(),
  purityComposition: joi
    .array()
    .items(
      joi.object({
        metalGroup: validators.id().required(),
        weight: joi.number().required(),
      })
    )
    .min(1)
    .required(),
  styleComposition: joi.array().items(
    joi.object({
      style: validators.id().required(),
      rate: joi.number().required(),
      rateAppliedOn: joi.string().valid('weight', 'piece').required(),
      weight: joi.number().required(),
      pieceCount: joi.number().required(),
      clarity: joi.string(),
      color: joi.string(),
      cut: joi.string(),
      shape: joi.string(),
      certificate: joi.string(),
    })
  ),
  isReturnable: joi.boolean().required(),
  returnPeriod: joi.number(),
});

export const updateProduct = joi.object({
  productType: validators.id(),
  metalGroup: validators.id(),
  item: validators.id(),
  collection: joi.string(),
  categories: joi.array().items(validators.id()),
  varieties: joi.array().items(validators.id()),
  grossWeight: joi.number(),
  stock: joi.number(),
  images: joi.array().items(validators.fileKey()).min(1),
  video: validators.fileKey(),
  hsn: validators.id(),
  huid: joi.string(),
  sku: joi.string(),
  description: joi.string(),
  height: joi.string(),
  length: joi.string(),
  purityComposition: joi.array().items(
    joi.object({
      metalGroup: validators.id().required(),
      weight: joi.number().required(),
    })
  ),
  styleComposition: joi.array().items(
    joi.object({
      style: validators.id().required(),
      rate: joi.number().required(),
      rateAppliedOn: joi.string().valid('weight', 'piece').required(),
      weight: joi.number().required(),
      pieceCount: joi.number().required(),
      clarity: joi.string(),
      color: joi.string(),
      cut: joi.string(),
      shape: joi.string(),
      certificate: joi.string(),
    })
  ),
  isReturnable: joi.boolean().required(),
  returnPeriod: joi.number(),
});
