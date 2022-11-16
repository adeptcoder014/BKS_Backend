import { Router } from 'express';
import * as controller from '../controllers/goldPrice.js';

const router = Router();

router.get('/', controller.getPriceHistory);

router.get('/latest', controller.getLatestGoldPrice);

export default router;
