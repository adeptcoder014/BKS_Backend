import { Router } from 'express';
import * as controller from '../controllers/shape.js';
import validation from '../validations/shape.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_shape'), controller.getList);

router.post(
  '/create',
  checkPerm('create_shape'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_shape'), controller.getOneById)
  .patch(
    checkPerm('update_shape'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_shape'), controller.deleteOneById);

export default router;
