import { Router } from 'express';
import * as controller from '../controllers/item.js';
import validation from '../validations/item.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_item'), controller.getList);

router.post(
  '/create',
  checkPerm('create_item'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_item'), controller.getOneById)
  .patch(
    checkPerm('update_item'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_item'), controller.deleteOneById);

export default router;
