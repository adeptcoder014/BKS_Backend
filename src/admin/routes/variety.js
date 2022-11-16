import { Router } from 'express';
import * as controller from '../controllers/variety.js';
import validation from '../validations/variety.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_variety.js'), controller.getList);

router.post(
  '/create',
  checkPerm('create_variety.js'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_variety.js'), controller.getOneById)
  .patch(
    checkPerm('update_variety.js'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_variety.js'), controller.deleteOneById);

export default router;
