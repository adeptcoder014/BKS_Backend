import { Router } from 'express';
import fileupload from '../../utils/fileupload.js';
import validate from '../../utils/validate.js';
import * as validation from '../validations/delivery.js';
import * as controller from '../controllers/delivery.js';

const handOverFields = [{ name: 'openingVideo', maxCount: 1 }];

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/reports', controller.getReports);
router.get('/orders', controller.getOrders);
router.get('/orders/:id', controller.getOrderById);

router.post(
  '/orders/:id/pack',
  fileupload.auto(['invoiceImage', 'packageImage']),
  validate(validation.packOrder),
  controller.packOrder
);

router.post(
  '/orders/:id/ship',
  fileupload.auto(['agentImage', 'agentDocument']),
  validate(validation.shipOrder),
  controller.shipOrder
);

router.post(
  '/orders/:id/manager/notify',
  validate(validation.notifyManager),
  controller.notifyManager
);

router.post(
  '/orders/:id/manager/handover',
  fileupload.fields(handOverFields),
  validate(validation.handOverOrder),
  controller.handOverOrder
);

export default router;
