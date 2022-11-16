import { Router } from 'express';
import * as controller from '../controllers/subscription.js';
import * as validation from '../validations/subscription.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';
import checkCustodian from '../middleware/checkCustodian.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getSubscriptions)
  .post(
    validate(validation.createSubscription),
    checkCustodian,
    controller.createSubscription
  );

router.route('/:id').get(controller.getSubscriptionById);

export default router;
