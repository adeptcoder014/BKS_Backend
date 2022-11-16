import { Router } from 'express';
import * as controller from '../controllers/track.js';

const router = Router();

router.get('/requests', controller.getRequests);
router.get('/verifier', controller.getVerifierOrders);

export default router;
