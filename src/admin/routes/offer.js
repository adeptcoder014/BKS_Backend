import { Router } from 'express';
import * as controller from '../controllers/offer.js';
import validation from '../validations/offer.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.post('/list', checkPerm('view_offer'), controller.getList);

router.post(
  '/create',
  checkPerm('create_offer'),
  fileupload.auto('image'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_offer'), controller.getOneById)
  .patch(
    checkPerm('update_offer'),
    fileupload.auto('image'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_offer'), controller.deleteOneById);

export default router;
