import { Router } from 'express';
import * as controller from '../controllers/refiner.js';
import * as validation from '../validations/refiner.js';
import validate from '../../utils/validate.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/reports', controller.getReports);
router.get('/bags', controller.getBags);
router.get('/bags/:id', controller.getBagById);
router.get('/bags/:id/overview', controller.getBagOverview);
router.get('/bags/:id/diff', controller.getBagWeightDiff);
router.post('/bags/:id/accept', validate(validation.accept), controller.accept);

router.post(
  '/bags/:id/check',
  fileupload.auto('image'),
  validate(validation.checkBag),
  controller.checkBag
);

router.get('/bags/:id/items/:qrCode', controller.getBagItemDiff);

router.post(
  '/bags/:id/items/:qrCode',
  fileupload.auto(['weightScaleImage', 'purityScaleImage']),
  validate(validation.checkBagItem),
  controller.checkBagItem
);

router.get('/items/:qrCode', controller.getItem);

router.post(
  '/refine/start',
  validate(validation.startRefining),
  controller.startRefining
);

router.get('/orders', controller.getRefinedOrders);
router
  .route('/orders/:id')
  .get(controller.getRefinedOrderById)
  .patch(
    fileupload.auto('weightScaleImage'),
    validate(validation.updateOrder),
    controller.updateRefinedOrder
  );

router.post('/generate-code', controller.generateItemCode);

router.post(
  '/orders/:id/items',
  fileupload.auto(['weightScaleImage', 'purityScaleImage']),
  validate(validation.addItem),
  controller.addItem
);

router
  .route('/orders/:id/items/:itemId')
  .get(controller.getItemById)
  .patch(
    fileupload.auto(['weightScaleImage', 'purityScaleImage']),
    validate(validation.updateItem),
    controller.updateItem
  )
  .delete(controller.deleteItem);

router.post('/orders/:id/complete', controller.completeRefining);

router.post(
  '/orders/:id/manager/notify',
  validate(validation.notifyManager),
  controller.notifyManager
);

router.post(
  '/orders/:id/manager/handover',
  validate(validation.handOver),
  controller.handOver
);

export default router;
