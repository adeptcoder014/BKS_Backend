import { Router } from 'express';
import auth from '../middleware/auth.js';
import * as controller from '../controllers/merchant.js';

const router = Router();

router.use(auth);

router.get('/', controller.getMerchants);
router.get('/selected', controller.getSelectedMerchant);
router.get('/:id', controller.getMerchantById);
router.post('/:id/select', controller.selectMerchant);

export default router;
