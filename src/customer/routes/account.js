import { Router } from 'express';
import * as controller from '../controllers/account.js';
import * as validation from '../validations/account.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getAccounts)
  .post(validate(validation.createAccount), controller.createAccount);

router
  .route('/:id')
  .get(controller.getAccountById)
  .patch(validate(validation.updateAccount), controller.updateAccount)
  .delete(controller.deleteAccount);

router.post('/:id/primary', controller.setPrimaryAccount);

export default router;
