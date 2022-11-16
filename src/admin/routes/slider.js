import { Router } from 'express';
import * as controller from '../controllers/slider.js';
import validation from '../validations/slider.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_slider'), controller.getList);

router.post(
  '/create',
  checkPerm('create_slider'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_slider'), controller.getOneById)
  .patch(
    checkPerm('update_slider'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_slider'), controller.deleteOneById);

export default router;
