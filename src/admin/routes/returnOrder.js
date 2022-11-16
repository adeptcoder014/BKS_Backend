import { Router } from 'express';
import * as controller from '../controllers/returnOrder.js';
import validation from '../validations/returnOrder.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_returnOrder'), controller.getList);

router.post(
  '/create',
  checkPerm('create_returnOrder'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_returnOrder'), controller.getOneById)
  .patch(
    checkPerm('update_returnOrder'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_returnOrder'), controller.deleteOneById);

export default router;
