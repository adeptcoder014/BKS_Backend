import Product from '../models/product.js';
import MakingCharge from '../models/makingCharge.js';
import roundValue from '../utils/roundValue.js';
import { BuySell, Collection } from '../models/index.js';
import logger from '../utils/logger.js';
import { getS3Url } from './s3.js';
import { resolveObjectId } from '../utils/util.js';

export const getGoldPrice = async () => {
  const latest = await BuySell.findOne().sort({ createdAt: -1 }).lean();
  return {
    buyPrice: latest?.buyPrice ?? 0,
    sellPrice: latest?.sellPrice ?? 0,
  };
};

export const getMakingChargeDocument = async (product) => {
  const data = await MakingCharge.findOne({
    merchant: merchantId,
    metalGroup: resolveObjectId(product.metalGroup),
  }).or([
    {
      item: resolveObjectId(product.item),
      variety: resolveObjectId(product.variety),
      productType: resolveObjectId(product.productType),
    },
    {
      item: resolveObjectId(product.item),
      variety: resolveObjectId(product.variety),
    },
    {
      item: resolveObjectId(product.item),
      productType: resolveObjectId(product.productType),
    },
    {
      variety: resolveObjectId(product.variety),
      productType: resolveObjectId(product.productType),
    },
    {
      item: resolveObjectId(product.item),
    },
    {
      variety: resolveObjectId(product.variety),
    },
    {
      productType: resolveObjectId(product.productType),
    },
  ]);

  if (!data) return null;

  return data.id;
};

export const getMakingCharge = (product, buyRate) => {
  if (!product.makingCharge) return 0;

  const item = product.makingCharge.rates.find((item) => {
    if (
      item.fromWeight <= product.grossWeight &&
      item.toWeight >= product.grossWeight
    ) {
      return true;
    }
    return false;
  });

  let amount = 0;

  switch (item.rateType) {
    case 'gross_weight':
      amount = product.grossWeight * item.rate;
      break;
    case 'net_weight':
      amount = product.netWeight + item.rate;
      break;
    case 'per_piece':
      amount = product.pieceCount * item.rate;
      break;
    case 'fixed':
      amount = item.rate;
      break;
    case 'gross_weight_percentage':
      amount =
        (item.rate / 100) *
        buyRate *
        (product.metalGroup.purity / 100) *
        product.grossWeight;
      break;
    case 'net_weight_percentage':
      amount =
        (item.rate / 100) *
        buyRate *
        (product.metalGroup.purity / 100) *
        product.netWeight;
      break;
  }
};

export const populateProduct = async (product) => {
  const collection = await Collection.findOneAndUpdate(
    { name: product.collectionId },
    {},
    { new: true, upsert: true }
  );

  await Promise.all([
    product.populate('item'),
    product.populate({
      path: 'metalGroup',
      populate: 'metal',
    }),
    product.populate({
      path: 'purityComposition.metalGroup',
      populate: 'unit',
    }),
    product.populate({
      path: 'styleComposition.style',
      populate: {
        path: 'metalGroup',
        populate: 'unit',
      },
    }),
  ]);

  let purityWeight = 0;
  let styleWeight = 0;

  for (const item of product.purityComposition) {
    const weight = roundValue(
      item.weight * item.metalGroup.unit.conversionFactor,
      3
    );

    item.name = item.metalGroup.name;
    item.purity = item.metalGroup.purity;

    purityWeight += weight;
  }

  for (const item of product.styleComposition) {
    item.name = item.style.name;
    item.unit = {
      name: item.style.metalGroup.unit.name,
      conversionFactor: item.style.metalGroup.unit.conversionFactor,
    };

    const weight = roundValue(
      item.weight * item.style.metalGroup.unit.conversionFactor,
      3
    );

    styleWeight += weight;
  }

  product.title = `${product.grossWeight} gm of ${product.metalGroup.metal.name} ${product.item?.name}`;
  product.collectionId = collection.id;
  product.purityWeight = roundValue(purityWeight, 3);
  product.styleWeight = roundValue(styleWeight, 3);
  product.netWeight = roundValue(product.purityWeight + product.styleWeight, 3);
};

export const getProductsPrice = async (filter, options = {}) => {
  const finalData = [];
  const [products, { buyPrice }] = await Promise.all([
    Product.find(filter, {}, options)
      .lean()
      .populate(['hsn', 'makingCharge'])
      .populate(options?.populate || [])
      .populate({
        path: 'metalGroup',
        select: 'name shortName metal purity',
        options: { lean: true },
        populate: 'metal',
      }),
    getGoldPrice(),
  ]);

  const priceBreakup = [];

  for (const product of products) {
    let purityPrice = 0;
    let stylePrice = 0;

    for (const item of product.purityComposition) {
      const rate = roundValue((item.purity / 100) * buyPrice, 2);
      const amount = roundValue(item.weight * rate, 2);
      purityPrice += amount;

      priceBreakup.push({
        category: 'main',
        name: item.name,
        rate,
        weight: item.weight,
        unit: 'g',
        amount,
      });
    }

    for (const item of product.styleComposition) {
      const amount = roundValue(
        item.rate *
          (item.rateAppliedOn === 'weight' ? item.weight : item.pieceCount),
        2
      );
      stylePrice += amount;

      priceBreakup.push({
        category: 'other',
        name: `${item.name} - ${item.pieceCount} No.s`,
        rate: item.rate,
        weight: item.weight,
        unit: item.unit.name,
        amount,
      });
    }

    purityPrice = roundValue(purityPrice, 2);
    stylePrice = roundValue(stylePrice, 2);

    const netWeight = product.netWeight;
    const metalPrice = roundValue(
      netWeight * (product.metalGroup.purity / 100) * buyPrice,
      2
    );
    const productPrice = roundValue(metalPrice + purityPrice + stylePrice, 2);

    const makingCharges = getMakingCharge(product);
    const subtotal = roundValue(productPrice + makingCharges, 2);
    const tax = roundValue(subtotal * (product.hsn.gst / 100), 2);
    const total = roundValue(subtotal + tax, 2);

    finalData.push({
      id: product.id,
      title: product.title,
      images: product.images.map(getS3Url),
      video: getS3Url(product.video),
      description: product.description,
      merchant: product.merchant?.name && {
        id: product.merchant?.id,
        name: product.merchant?.name,
        image: getS3Url(product.merchant?.image),
      },
      viewCount: product.viewCount,
      purchaseCount: product.purchaseCount,
      stock: product.stock,
      seller: '',
      sku: product.sku,
      purity: product.metalGroup.shortName,
      grossWeight: product.grossWeight,
      netWeight: product.netWeight,
      height: product.height,
      length: product.length,
      huid: product.huid,
      hsn: product.hsn?.code,
      isReturnable: product.isReturnable,
      purityComposition: product.purityComposition.map((item) => ({
        name: `${item.name}`,
        weight: item.weight,
        purity: item.purity,
      })),
      styleComposition: product.styleComposition.map((item) => ({
        name: `${item.pieceCount} ${item.name}`,
        type: item.name,
        rate: item.rate,
        rateAppliedOn: item.rateAppliedOn,
        weight: item.weight,
        pieceCount: item.pieceCount,
        size: item.size,
        color: item.color,
        cut: item.cut,
        shape: item.shape,
        certificate: item.certificate,
      })),
      pricing: {
        breakup: priceBreakup,
        buyRate: buyPrice,
        makingCharges,
        subtotal,
        taxPercentage: product.hsn.gst,
        taxAmount: tax,
        total,
      },
    });
  }

  return finalData;
};
