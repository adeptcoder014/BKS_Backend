import { Router } from 'express';
import * as controller from '../controllers/upi.js';
import * as validation from '../validations/upi.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get(
  '/:id',
  validate(validation.getUPI, { field: 'params' }),
  controller.getUPI
);

router.post('/pay', validate(validation.pay), controller.pay);

export default router;
