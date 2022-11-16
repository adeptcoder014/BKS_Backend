import { Router } from 'express';
import * as controller from '../controllers/calculation.js';

const router = Router();

router.get('/', controller.getCalculations);

router.get('/:id', controller.getCalculationById);

export default router;
