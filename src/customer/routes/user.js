import { Router } from 'express';
import auth from '../middleware/auth.js';
import validate from '../../utils/validate.js';
import fileupload from '../../utils/fileupload.js';
import * as controller from '../controllers/user.js';
import * as validation from '../validations/user.js';

const router = Router();

router.use(auth);

router
  .route('/@me')
  .get(controller.getLoggedInUser)
  .patch(
    fileupload.single('image'),
    validate(validation.updateUser),
    controller.updateUser
  );

router.get('/@me/wallets', controller.getUserWallet);

router.get('/@me/transactions', controller.getUserTransactions);

router.post(
  '/@me/profile',
  validate(validation.createProfile),
  controller.createProfile
);

router.patch(
  '/@me/change-number',
  validate(validation.changeMobileNumber),
  controller.changeMobileNumber
);

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
