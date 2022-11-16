import { Router } from 'express';
import * as controller from '../controllers/reserve.js';
import * as validation from '../validations/reserve.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/available-gold', controller.getAvailableGoldForSell);

router
  .route('/')
  .get(controller.getReserves)
  .post(validate(validation.createReserve), controller.createReserve);

router.get('/:id', controller.getReserveById);
router.post('/:id/buy', controller.buyReserved);

export default router;
