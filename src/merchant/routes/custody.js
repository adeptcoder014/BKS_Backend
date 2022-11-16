import { Router } from 'express';
import * as controller from '../controllers/custody.js';

const router = Router();

router.get('/', controller.getCustody);
router.get('/users/:id', controller.getCustodyByUser);

export default router;
