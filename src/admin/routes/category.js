import { Router } from 'express';
import * as controller from '../controllers/category.js';
import validation from '../validations/category.js';
import validate from '../../utils/validate.js';
import fileupload from '../../utils/fileupload.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_category'), controller.getList);

router.post(
  '/create',
  checkPerm('create_category'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_category'), controller.getOneById)
  .patch(
    checkPerm('update_category'),
    validate(validation.update),
    fileupload.auto('image'),
    controller.updateOneById
  )
  .delete(checkPerm('delete_category'), controller.deleteOneById);

export default router;
