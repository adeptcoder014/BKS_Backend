import { Router } from 'express';
import * as controller from '../controllers/accounting.js';

const router = Router();

router.get('/overview', controller.getOverview);
router.get('/sales', controller.getSaleInvoices);
router.get('/purchases', controller.getPurchaseInvoices);
router.get('/advances', controller.getAdvanceInvoices);
router.get('/commissions', controller.getCommissionInvoices);
router.get('/services', controller.getServiceInvoices);

router.get('/invoices/:id', controller.getInvoiceById);

router.get('/custody', controller.getCustody);
router.get('/custody/users/:id', controller.getCustodyByUser);

export default router;
