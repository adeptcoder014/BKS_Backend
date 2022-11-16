import { Router } from 'express';
import * as controller from '../controllers/auth.js';
import * as validation from '../validations/auth.js';
import validate from '../../utils/validate.js';

const router = Router();

router.post('/send-otp', validate(validation.sendOtp), controller.sendOtp);

router.post(
  '/verify-otp',
  validate(validation.verifyOtp),
  controller.verifyOtp
);

router.post(
  '/reset-mpin',
  validate(validation.resetMpin),
  controller.resetMpin
);

router.post(
  '/verify-details',
  validate(validation.verifyDetails),
  controller.verifyDetails
);

router.post(
  '/register',
  validate(validation.registerAccount),
  controller.registerAccount
);

export default router;
