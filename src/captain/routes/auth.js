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
router.post('/login', validate(validation.login), controller.login);
router.post(
  '/reset-mpin',
  validate(validation.resetMpin),
  controller.resetMpin
);

export default router;
