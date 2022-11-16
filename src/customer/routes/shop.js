import { Router } from 'express';
import * as controller from '../controllers/shop.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', controller.getShops);

export default router;
