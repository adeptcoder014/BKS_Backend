import { Router } from 'express';
import fileupload from '../../utils/fileupload.js';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/verifier.js';
import * as validation from '../validations/verifier.js';

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/reports', controller.getReports);
router.get('/vehicles', controller.getVehicles);

router
  .route('/guards')
  .get(controller.getSecurityGuards)
  .post(
    validate(validation.createSecurityGuard),
    controller.createSecurityGuard
  );

router.get('/styles', controller.getStyles);
router.get('/requests', controller.getRequests);
router.get('/requests/:id', controller.getRequestById);
router.get('/requests/:id/overview', controller.getRequestOverview);

router.post(
  '/requests/:id/start',
  validate(validation.startVerifying),
  controller.startVerifying
);

router.post(
  '/requests/:id/reached',
  validate(validation.reachedLocation),
  controller.reachedLocation
);

router
  .route('/requests/:id/items')
  .get(controller.getItems)
  .post(
    fileupload.auto('image'),
    validate(validation.addItem),
    controller.addItem
  );

router
  .route('/requests/:id/items/:itemId')
  .patch(
    fileupload.auto('image'),
    validate(validation.updateItem),
    controller.updateItem
  )
  .delete(controller.deleteItem);

router.post(
  '/requests/:id/send-otp',
  validate(validation.sendOTP),
  controller.sendVerificationCode
);

router.post(
  '/requests/:id/verify-otp',
  validate(validation.verifyOTP),
  controller.verifyOTP
);

router.post(
  '/requests/:id/melt',
  fileupload.auto(['purityScaleImage', 'weightScaleImage']),
  validate(validation.meltGold),
  controller.meltGold
);

router.post(
  '/requests/:id/upload',
  validate(validation.uploadGold),
  controller.uploadGold
);

router.post(
  '/requests/:id/sell',
  validate(validation.sellGold),
  controller.sellGold
);

router.post(
  '/requests/:id/reject',
  validate(validation.reject),
  controller.reject
);

router.post(
  '/requests/:id/pick',
  fileupload.auto('weightScaleImage'),
  validate(validation.pickItems),
  controller.pickItems
);

router.post(
  '/requests/:id/manager/notify',
  validate(validation.notifyManager),
  controller.notifyManager
);

router.post(
  '/requests/:id/manager/handover',
  validate(validation.handOverRequest),
  controller.handOverRequest
);

export default router;
