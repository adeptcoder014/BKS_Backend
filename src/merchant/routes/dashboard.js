import { Router } from 'express';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/dashboard.js';
import * as validation from '../validations/dashboard.js';

const router = Router();

router.get('/custodian', controller.getCustodianOverview);
router.get('/ecom', controller.getEcomOverview);
router.get('/verifier', controller.getVerifierOverview);
router.get('/refiner', controller.getRefinerOverview);

router.get('/revenue', controller.getRevenue);
router.get('/sales', controller.getSales);
router.get('/purchases', controller.getPurchases);

router.get('/invoices/:id', controller.getInvoiceById);

router.post(
  '/sales/settle',
  validate(validation.settleSales),
  controller.settleSales
);

router.post(
  '/purchases/settle',
  validate(validation.settlePurchases),
  controller.settlePurchases
);

export default router;
