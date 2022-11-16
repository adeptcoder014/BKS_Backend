import { Router } from 'express';
import * as controller from '../controllers/merchant.js';
import validation from '../validations/merchant.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.get('/gst/:gstNo', controller.getGstInfo);

router.post('/list', checkPerm('view_merchant'), controller.getList);

router.post(
  '/create',
  checkPerm('create_merchant'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_merchant'), controller.getOneById)
  .patch(
    checkPerm('update_merchant'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_merchant'), controller.deleteOneById);

export default router;
