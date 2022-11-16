import { Router } from 'express';
import * as controller from '../controllers/order.js';
import validation from '../validations/order.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_order'), controller.getList);

router.post(
  '/create',
  checkPerm('create_order'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_order'), controller.getOneById)
  .patch(
    checkPerm('update_order'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_order'), controller.deleteOneById);

export default router;
