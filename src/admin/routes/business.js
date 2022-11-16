import { Router } from 'express';
import * as controller from '../controllers/business.js';
import validation from '../validations/business.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_business'), controller.getList);

router.post(
  '/create',
  checkPerm('create_business'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_business'), controller.getOneById)
  .patch(
    checkPerm('update_business'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_business'), controller.deleteOneById);

export default router;
