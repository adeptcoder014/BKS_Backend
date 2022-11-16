import { Router } from 'express';
import fileupload from '../../utils/fileupload.js';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/manager.js';
import * as validation from '../validations/manager.js';

const router = Router();

router.get('/captains', controller.getCaptains);

// delivery
router.get('/delivery', controller.getDeliveryOrders);
router.get('/delivery/overview', controller.getDeliveryOverview);
router.get('/delivery/reports', controller.getDeliveryReports);

router.get('/delivery/:id', controller.getDeliveryOrderById);

router.post(
  '/delivery/:id/pack',
  fileupload.auto(['invoiceImage', 'packageImage']),
  validate(validation.packDeliveryOrder),
  controller.packDeliveryOrder
);

router.post(
  '/delivery/:id/ship',
  fileupload.auto(['agentImage', 'agentDocument']),
  validate(validation.shipDeliveryOrder),
  controller.shipDeliveryOrder
);

router.post(
  '/delivery/:id/items/:itemId',
  fileupload.auto('weightScaleImage'),
  validate(validation.reviewDeliveryItem),
  controller.reviewDeliveryItem
);

router.post(
  '/delivery/:id/captain/notify',
  validate(validation.notifyDeliveryCaptain),
  controller.notifyDeliveryCaptain
);

router.post(
  '/delivery/:id/captain/assign',
  validate(validation.assignDeliveryOrder),
  controller.assignDeliveryOrder
);

// return
router.get('/returns', controller.getReturnOrders);
router.get('/returns/reports', controller.getReturnReports);
router.get('/returns/reorders', controller.getReturnReorders);
router.get('/returns/overview', controller.getReturnOverview);
router.get('/returns/:id', controller.getReturnOrderById);
router.post(
  '/returns/:id/receive',
  fileupload.auto(['agentImage', 'agentDocument', 'packageImage']),
  validate(validation.receiveReturnOrder),
  controller.receiveReturnOrder
);
router.post(
  '/returns/:id/process',
  validate(validation.processReturnOrder),
  controller.processReturnOrder
);
router.post(
  '/returns/:id/items/:itemId/recheck',
  validate(validation.recheckReturnOrderItem),
  controller.recheckReturnOrderItem
);

router.post(
  '/returns/captain/notify',
  validate(validation.notifyReturnCaptain),
  controller.notifyReturnCaptain
);
router.post(
  '/returns/captain/assign',
  validate(validation.assignReturnCaptain),
  controller.assignReturnCaptain
);

// verifier
router.get('/verifier/overview', controller.getVerifierOverview);
router.get('/verifier/reports', controller.getVerifierReports);
router.get('/verifier/appointments', controller.getVerifierAppointments);
router.get('/verifier/appointments/booked', controller.getBookedSlots);
router.get('/verifier/appointments/:id', controller.getVerifierAppointmentById);
router.post(
  '/verifier/appointments/:id/accept',
  validate(validation.acceptVerifierAppointment),
  controller.acceptVerifierAppointment
);

router.post(
  '/verifier/appointments/:id/reschedule',
  validate(validation.rescheduleVerifierAppointment),
  controller.rescheduleVerifierAppointment
);

router.get('/verifier/orders', controller.getVerifierOrders);
router.get('/verifier/orders/:id', controller.getVerifierOrderById);

router.post(
  '/verifier/captains/notify',
  validate(validation.notifyVerifierCaptain),
  controller.notifyVerifierCaptain
);
router.post(
  '/verifier/captains/assign',
  validate(validation.assignVerifierCaptain),
  controller.assignVerifierCaptain
);

router.get('/verifier/bags/diff', controller.getVerifiedBagDifference);
router.post(
  '/verifier/bags/send',
  fileupload.auto('image'),
  validate(validation.sendToVerifierWarehouse),
  controller.sendToVerifierWarehouse
);
router.post(
  '/verifier/bags/recheck',
  fileupload.auto([
    'actualWeightScaleImage',
    'bagWeightScaleImage',
    'purityScaleImage',
  ]),
  validate(validation.recheckVerifiedBag),
  controller.recheckVerifiedBag
);
router.post(
  '/verifier/bags/pack',
  fileupload.auto('image'),
  validate(validation.packVerifiedBags),
  controller.packVerifiedBags
);

router.get('/verifier/boxes', controller.getVerifiedBoxes);
router.get('/verifier/boxes/:id', controller.getVerifiedBoxById);
router.post(
  '/verifier/boxes/:id/ship',
  fileupload.auto(['agentImage', 'agentDocument']),
  validate(validation.shipVerifiedBox),
  controller.shipVerifiedBox
);

// refiner
router.get('/refiner/overview', controller.getRefinerOverview);
router.get('/refiner/reports', controller.getRefinerReports);
router.get('/refiner/orders', controller.getRefinerOrders);
router.get('/refiner/orders/:id', controller.getRefinerOrderById);

router.post(
  '/refiner/orders/:id/receive',
  fileupload.auto(['agentImage', 'agentDocument', 'packageImage']),
  validate(validation.receiveRefinerOrder),
  controller.receiveRefinerOrder
);

router.post(
  '/refiner/captain/notify',
  validate(validation.notifyRefinerCaptain),
  controller.notifyRefinerCaptain
);
router.post(
  '/refiner/captain/assign',
  validate(validation.assignRefinerCaptain),
  controller.assignRefinerCaptain
);

router.get('/refiner/refined', controller.getRefinedOrders);
router.get('/refiner/refined/:id', controller.getRefinedOrderById);

router.post('/refiner/refined/:id/check', controller.checkRefinedOrder);

router.get('/refiner/bars', controller.getBars);
router.post(
  '/refiner/bars/pack',
  fileupload.auto('image'),
  controller.packBars
);

router.post(
  '/refiner/orders/:id/ship',
  fileupload.auto(['agentImage', 'agentDocument']),
  validate(validation.shipBox),
  controller.shipBox
);

// Custodian
router.get('/custodian/overview', controller.getCustodianOverview);
router.get('/custodian/reports', controller.getCustodianReports);
router.get('/custodian/orders', controller.getCustodianOrders);
router.get('/custodian/orders/:id', controller.getCustodianOrderById);

router.post(
  '/custodian/orders/:id/receive',
  fileupload.auto(['agentImage', 'agentDocument', 'packageImage']),
  validate(validation.receiveCustodianOrder),
  controller.receiveCustodianOrder
);

router.post(
  '/custodian/orders/:id/check',
  validate(validation.scanAndCheckOrder),
  controller.scanAndCheck
);

router.post(
  '/custodian/orders/:id/bar',
  fileupload.auto(['weightScaleImage', 'purityScaleImage']),
  controller.checkBar
);

router.post(
  '/custodian/orders/:id/submit',
  validate(validation.submitCustodianOrder),
  controller.submitCustodianOrder
);

export default router;
