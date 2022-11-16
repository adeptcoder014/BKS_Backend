import { Router } from 'express';
import * as controller from '../controllers/cyclePeriod.js';

const router = Router();

router.get('/', controller.getCyclePeriods);
router.get('/:id', controller.getCyclePeriodById);

export default router;
