import { Router } from 'express';
import * as controller from '../controllers/user.js';
import * as validation from '../validations/user.js';
import validate from '../../utils/validate.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router
  .route('/@me')
  .get(controller.getLoggedInUser)
  .patch(
    fileupload.auto('image'),
    validate(validation.updateProfile),
    controller.updateProfile
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

router
  .route('/')
  .get(controller.getUsers)
  .post(
    fileupload.auto('image'),
    validate(validation.createUser),
    controller.createUser
  );

router
  .route('/:id')
  .get(controller.getUserById)
  .patch(
    fileupload.auto('image'),
    validate(validation.updateUser),
    controller.updateUser
  )
  .delete(controller.deleteUser);

export default router;
