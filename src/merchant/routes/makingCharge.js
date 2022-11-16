import { Router } from 'express';
import * as controller from '../controllers/makingCharge.js';
import * as validation from '../validations/makingCharge.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getMakingCharges)
  .post(validate(validation.createMakingCharge), controller.createMakingCharge);

router
  .route('/:id')
  .get(controller.getMakingChargeById)
  .patch(validate(validation.updateMakingCharge), controller.updateMakingCharge)
  .delete(controller.deleteMakingCharge);

export default router;
