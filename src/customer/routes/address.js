import { Router } from 'express';
import * as controller from '../controllers/address.js';
import * as validation from '../validations/address.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getAddresses)
  .post(validate(validation.createAddress), controller.createAddress);

router
  .route('/:id')
  .get(controller.getAddressById)
  .patch(validate(validation.updateAddress), controller.updateAddress)
  .delete(controller.deleteAddress);

router.get('/:id/service-status', controller.getServiceableStatus);

router.post('/:id/primary', controller.setPrimaryAddress);

export default router;
