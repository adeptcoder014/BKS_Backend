import { ReturnOrder } from '../../models/index.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';

export const getReturnOrders = async (req, res) => {
  const data = await ReturnOrder.find({ user: req.user.id }).lean({
    getters: true,
  });

  const transformed = data.reduce((pre, cur) => {
    const { items, ...order } = cur;
    let status;

    for (const item of items) {
      switch (order.status) {
        case 'placed':
        case 'delivered':
          status = order.status;
          break;
        case 'checked':
          status = 'processing';
          break;
        case 'completed':
          status = item.status;
          break;
      }

      pre.push({
        id: order.id,
        orderId: order.orderId,
        productId: item.product.id,
        title: item.title,
        image: item.image,
        quantity: item.quantity,
        estimatedDeliveryDate: order.estimatedDeliveryDate ?? '',
        createdAt: order.createdAt ?? '',
        deliveredAt: order.deliveredAt ?? '',
        status,
      });
    }

    return pre;
  }, []);

  res.json(transformed);
};

export const getReturnOrderById = async (req, res) => {
  const order = await ReturnOrder.findOne({
    user: req.user.id,
    _id: req.params.id,
  }).lean({ getters: true });

  if (!order)
    throw new APIError(
      'order does not exist',
      APIError.RESOURCE_NOT_FOUND,
      404
    );

  const item = order.items[0];
  let status;

  switch (order.status) {
    case 'placed':
    case 'delivered':
      status = order.status;
      break;
    case 'checked':
      status = 'processing';
      break;
    case 'completed':
      status = 'completed';
      break;
  }

  return res.json({
    id: order.id,
    orderId: order.orderId,
    productId: item.product.id,
    title: item.title,
    image: item.image,
    quantity: item.quantity,
    estimatedDeliveryDate: order.estimatedDeliveryDate ?? '',
    totalAmount: item.totalAmount,
    returnStatus: item.status,
    rejectedReason: item.rejectedReason ?? '',
    openingVideo: order.openingVideo ?? '',
    checkingVideo: item.checkingVideo ?? '',
    createdAt: order.createdAt ?? '',
    deliveredAt: order.deliveredAt ?? '',
    status,
  });
};
