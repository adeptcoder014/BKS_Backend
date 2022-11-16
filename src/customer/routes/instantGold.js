import { Router } from 'express';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';
import * as controller from '../controllers/instantGold.js';
import * as validation from '../validations/instantGold.js';

const router = Router();

router.use(auth);

router.post('/buy', validate(validation.buyGold), controller.buyInstantGold);

router.post('/sell', validate(validation.sellGold), controller.sellInstantGold);

export default router;
