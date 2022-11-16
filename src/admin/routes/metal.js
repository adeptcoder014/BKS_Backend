import { Router } from 'express';
import * as controller from '../controllers/metal.js';
import validation from '../validations/metal.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_metal'), controller.getList);

router.post(
  '/create',
  checkPerm('create_metal'),
  fileupload.auto('icon'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_metal'), controller.getOneById)
  .patch(
    checkPerm('update_metal'),
    fileupload.auto('icon'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_metal'), controller.deleteOneById);

export default router;
