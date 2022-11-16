import { Router } from 'express';
import * as controller from '../controllers/order.js';
import * as validation from '../validations/order.js';
import auth from '../middleware/auth.js';
import validate from '../../utils/validate.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getOrders)
  .post(validate(validation.createOrder), controller.createOrder);

router.get('/:id', controller.getOrderById);

router.post(
  '/:id/cancel',
  validate(validation.cancelOrder),
  controller.cancelOrder
);

router.post(
  '/:id/return',
  validate(validation.returnOrder),
  controller.returnOrder
);

export default router;
