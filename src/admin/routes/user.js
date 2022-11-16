import { Router } from 'express';
import fileupload from '../../utils/fileupload.js';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/user.js';
import { checkPerm } from '../middleware/auth.js';
import { createUser, updateUser } from '../validations/user.js';

const router = Router();

router.post('/list', checkPerm('view_user'), controller.getList);

router.post(
  '/create',
  checkPerm('create_user'),
  fileupload.auto('image'),
  validate(createUser),
  controller.create
);

router.get('/@me', controller.getLoggedInUser);

router
  .route('/:id')
  .get(checkPerm('view_user'), controller.getOneById)
  .patch(
    checkPerm('update_user'),
    fileupload.auto('image'),
    validate(updateUser),
    controller.updateOneById
  )
  .delete(checkPerm('delete_user'), controller.deleteOneById);

export default router;
