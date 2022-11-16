import { Router } from 'express';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/auth.js';
import {
  forgotPassword,
  login,
  resetPassword,
  validateLogin,
} from '../validations/auth.js';

const router = Router();

router.post('/validate', validate(validateLogin), controller.validateLogin);
router.post('/login', validate(login), controller.login);
router.post(
  '/forgot-password',
  validate(forgotPassword),
  controller.forgotPassword
);
router.post(
  '/reset-password',
  validate(resetPassword),
  controller.resetPassword
);

export default router;
