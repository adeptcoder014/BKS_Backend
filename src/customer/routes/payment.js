import { Router } from 'express';
import * as controller from '../controllers/payment.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/:id', auth, controller.receivePayment);

export default router;
