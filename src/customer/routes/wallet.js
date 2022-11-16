import { Router } from 'express';
import * as controller from '../controllers/wallet.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', controller.getWallets);
router.get('/:id', controller.getWalletById);
router.get('/:id/transactions', controller.getWalletTransactions);

export default router;
