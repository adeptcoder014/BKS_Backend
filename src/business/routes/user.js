import { Router } from 'express';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/user.js';
import * as validation from '../validations/user.js';

const router = Router();

router
  .route('/@me')
  .get(controller.getLoggedInUser)
  .patch(validate(validation.updateProfile), controller.updateProfile);

router.post(
  '/@me/verify-mpin',
  validate(validation.verifyMpin),
  controller.verifyMpin
);

router.post(
  '/@me/change-mpin',
  validate(validation.changeMpin),
  controller.changeMpin
);

export default router;
