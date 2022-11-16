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

router.post('/register', validate(validation.register), controller.register);

router.post(
  '/verify-bank',
  validate(validation.verifyBank),
  controller.verifyBank
);

router.post(
  '/register-bank',
  validate(validation.registerBank),
  controller.registerBank
);

router.post(
  '/reset-mpin',
  validate(validation.resetMpin),
  controller.resetMpin
);

export default router;
