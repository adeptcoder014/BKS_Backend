import { Router } from 'express';
import * as controller from '../controllers/label.js';
import validation from '../validations/label.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_label'), controller.getList);

router.post(
  '/create',
  checkPerm('create_label'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_label'), controller.getOneById)
  .patch(
    checkPerm('update_label'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_label'), controller.deleteOneById);

export default router;
