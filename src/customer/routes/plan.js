import { Router } from 'express';
import * as controller from '../controllers/plan.js';

const router = Router();

router.get('/', controller.getPlans);
router.get('/:id', controller.getPlanById);

export default router;
