import { Router } from 'express';
import * as controller from '../controllers/ornament.js';
import validation from '../validations/ornament.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_ornament'), controller.getList);

router.post(
  '/create',
  checkPerm('create_ornament'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_ornament'), controller.getOneById)
  .patch(
    checkPerm('update_ornament'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_ornament'), controller.deleteOneById);

export default router;
