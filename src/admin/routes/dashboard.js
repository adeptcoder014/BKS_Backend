import { Router } from 'express';
import * as controller from '../controllers/dashboard.js';

const router = Router();

router.get('/analytics/app', controller.getAppAnalytics);
router.get('/analytics/orders', controller.getOrdersAnalytics);
router.get('/analytics/peoples', controller.getPeopleAnalytics);
router.get('/analytics/custody', controller.getCustodyAnalytics);
router.get('/analytics/sale-purchases', controller.getSalePurchaseAnalytics);
router.get('/analytics/receivables', controller.getReceivableAnalytics);
router.get('/analytics/settlements', controller.getSettlementAnalytics);
router.get('/analytics/commissions', controller.getCommissionAnalytics);

export default router;
