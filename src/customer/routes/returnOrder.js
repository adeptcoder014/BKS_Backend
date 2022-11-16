import { Router } from 'express';
import * as controller from '../controllers/returnOrder.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.use('/', controller.getReturnOrders);
router.use('/:id', controller.getReturnOrderById);

export default router;
