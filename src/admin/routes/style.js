import { Router } from 'express';
import * as controller from '../controllers/style.js';
import validation from '../validations/style.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_style'), controller.getList);

router.post(
  '/create',
  checkPerm('create_style'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_style'), controller.getOneById)
  .patch(
    checkPerm('update_style'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_style'), controller.deleteOneById);

export default router;
