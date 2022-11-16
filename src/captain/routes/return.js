import { Router } from 'express';
import * as controller from '../controllers/return.js';
import * as validation from '../validations/return.js';
import validate from '../../utils/validate.js';

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/reports', controller.getReports);
router.get('/reasons', controller.getRejectReasons);
router.get('/orders', controller.getOrders);
router.get('/orders/:id', controller.getOrderById);

router.post(
  '/orders/:id/check',
  validate(validation.checkOrder),
  controller.checkOrder
);

router.post(
  '/orders/:id/items/:itemId/check',
  validate(validation.checkOrderItem),
  controller.checkOrderItem
);

router.post('/orders/:id/manager/notify', controller.notifyManager);

router.post(
  '/orders/:id/manager/handover',
  validate(validation.handOverOrder),
  controller.handOverOrder
);

export default router;
