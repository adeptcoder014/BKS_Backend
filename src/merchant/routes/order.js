import { Router } from 'express';
import * as controller from '../controllers/order.js';

const router = Router();

router.get('/delivery', controller.getDeliveryOrders);
router.get('/delivery/overview', controller.getDeliveryOverview);
router.get('/delivery/:id', controller.getDeliveryOrderById);

router.get('/return', controller.getReturnOrders);
router.get('/return/overview', controller.getReturnOverview);
router.get('/return/:id', controller.getReturnOrderById);

router.get('/verifier', controller.getVerifierOrders);
router.get('/verifier/overview', controller.getVerifierOverview);
router.get('/verifier/:id', controller.getVerifierOrderById);

router.get('/refiner', controller.getRefinerOrders);
router.get('/refiner/overview', controller.getRefinerOverview);
router.get('/refiner/:id', controller.getRefinerOrderById);

export default router;
