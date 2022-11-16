import { Router } from 'express';
import * as controller from '../controllers/productType.js';
import validation from '../validations/productType.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_productType'), controller.getList);

router.post(
  '/create',
  checkPerm('create_productType'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_productType'), controller.getOneById)
  .patch(
    checkPerm('update_productType'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_productType'), controller.deleteOneById);

export default router;
