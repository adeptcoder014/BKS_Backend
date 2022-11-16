import { Router } from 'express';
import * as controller from '../controllers/appointment.js';
import * as validation from '../validations/appointment.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.post(
  '/',
  validate(validation.createAppointment),
  controller.createAppointment
);

export default router;
