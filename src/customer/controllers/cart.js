import jwt from 'jsonwebtoken';
import Cart from '../../models/cart.js';
import { getCalculation } from '../../services/application.js';
import { getProductsPrice } from '../../services/ecom.js';
import { getS3KeyFromUrl } from '../../services/s3.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';

export const getCart = async (req, res) => {
  const cart =
    (await Cart.findOne({ user: req.user.id }).lean()) ||
    (await Cart.create({ user: req.user.id }));

  const data = cart.items.length
    ? await getProductsPrice(
        {
          _id: cart.items.map((item) => item.product),
        },
        { populate: ['merchant'] }
      )
    : [];

  const shippingAmount = 0;
  const pricingData = { tax: 0, taxAmount: 0, subtotal: 0 };
  const buyPrice = data[0]?.pricing.buyRate;
  const payload = { items: [] };

  const finalData = cart.items
    .map((item) => {
      const product = data.find((e) => e.id.equals(item.product));
      if (!product) return null;

      payload.items.push({
        id: product.id,
        merchant: product.merchant.id,
        title: product.title,
        image: getS3KeyFromUrl(product.images[0]),
        weight: product.grossWeight,
        purity: product.purity,
        quantity: item.quantity,
        makingCharge: roundValue(
          product.pricing.makingCharges * item.quantity,
          2
        ),
        rate: product.pricing.subtotal,
        tax: product.pricing.gstPercentage,
        taxAmount: roundValue(product.pricing.gstAmount * item.quantity, 2),
        totalAmount: roundValue(product.pricing.total * item.quantity, 2),
      });

      pricingData.tax += product.pricing.gstPercentage;
      pricingData.taxAmount += product.pricing.gstAmount;
      pricingData.subtotal += roundValue(
        product.pricing.subtotal * item.quantity,
        2
      );

      return {
        id: product.id,
        title: product.title,
        image: product.images[0],
        seller: product.merchant.name,
        quantity: item.quantity,
        rate: product.pricing.subtotal,
        amount: roundValue(product.pricing.subtotal * item.quantity, 2),
      };
    })
    .filter(Boolean);

  payload.buyPrice = buyPrice;
  payload.tax = Math.ceil(pricingData.tax / finalData.length);
  payload.taxAmount = roundValue(pricingData.taxAmount, 2);
  payload.shippingAmount = shippingAmount;
  payload.subtotal = roundValue(pricingData.subtotal, 2);
  payload.totalAmount = roundValue(
    pricingData.subtotal + pricingData.taxAmount + shippingAmount,
    2
  );

  res.json({
    id: cart.id,
    items: finalData,
    buyPrice,
    tax: payload.tax,
    taxAmount: payload.taxAmount,
    shippingAmount: payload.shippingAmount,
    subtotal: payload.subtotal,
    totalAmount: payload.totalAmount,
    token: jwt.sign(payload, process.env.SECRET, {
      expiresIn: '10m',
    }),
  });
};

export const addItem = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  const productId = req.body.productId;
  const quantity = req.body.quantity;

  if (cart) {
    const item = cart.items.find((e) => e.product.equals(productId));
    if (item) item.set({ quantity });
    if (!item) cart.items.push({ product: productId, quantity });
    await cart.save();
    res.status(201).json(cart);
    return;
  }

  const data = await Cart.create({
    user: req.user.id,
    items: [{ product: productId, quantity: quantity }],
  });

  res.status(201).json({
    message: 'success',
  });
};

export const updateItem = async (req, res) => {
  await Cart.updateOne(
    { user: req.user.id, 'items.product': req.params.itemId },
    { 'items.$.quantity': req.body.quantity }
  );

  res.json({
    message: 'success',
  });
};

export const deleteItem = async (req, res) => {
  await Cart.updateOne(
    { user: req.user.id },
    {
      $pull: {
        items: { product: req.params.itemId },
      },
    }
  );

  res.json({
    message: 'success',
  });
};

export const updateBulkItems = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });

  for (const key in req.body) {
    const item = cart.items.find((item) => item.product.equals(key));
    const quantity = req.body[key];

    if (quantity === 0) {
      cart.items = cart.items.filter((e) => !e.product.equals(item.product));
    } else if (item) {
      item.quantity = quantity;
    } else {
      cart.items.push({ product: key, quantity });
    }
  }

  await cart.save();

  res.json({
    message: 'success',
  });
};

export const checkout = async (req, res) => {
  let ids = [];
  let gst = getCalculation('gst');

  if (!req.body.products) req.body.products = {};

  if (req.body.productId) {
    ids.push(req.body.productId);
  } else {
    const cart = await Cart.findOne({ user: req.user.id }).lean();
    if (!cart)
      throw new APIError(
        'Cart could not be found',
        APIError.RESOURCE_NOT_FOUND
      );

    ids = cart.items.map((item) => {
      if (!req.body.products[item.product.toString()]) {
        req.body.products[item.product.toString()] = item.quantity;
      }
      return item.product;
    });
  }

  const products = await getProductsPrice(
    { _id: ids },
    { populate: ['merchant'] }
  );
  const payload = { buyPrice: products[0]?.buyRate };
  const data = [];

  for (const product of products) {
    const quantity =
      req.body.quantity ?? (req.body.products[product.id.toString()] || 1);
    // const amount =
    const baseTotal = roundValue(product.total * (1 + gst / 100));

    const payloadData = {
      title: product.title,
      purity: product.purity,
      weight: product.grossWeight,
      quantity,
      rate: product.pricing.subtotal,
      makingCharge: product.makingCharge,
      tax: product.pricing.gstPercentage,
      taxAmount: product.pricing.gstAmount,
      amount: roundValue(quantity * product.pricing.subtotal, 2),
      totalAmount: base,
    };

    payload[product.id.toString()] = payloadData;

    Object.assign(product, {
      gst,
      gstAmount: payloadData.gstAmount,
      total: baseTotal,
    });

    data.push({
      product,
      quantity,
      gst,
      gstAmount: payloadData.gstAmount * quantity,
      total: baseTotal * quantity * 1,
    });
  }

  const token = jwt.sign(payload, process.env.SECRET);

  res.status(201).json({
    token,
    items: data,
  });
};
