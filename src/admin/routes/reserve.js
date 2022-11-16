import { Router } from 'express';
import * as controller from '../controllers/reserve.js';
import validation from '../validations/reserve.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_reserve'), controller.getList);

router.post(
  '/create',
  checkPerm('create_reserve'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_reserve'), controller.getOneById)
  .patch(
    checkPerm('update_reserve'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_reserve'), controller.deleteOneById);

export default router;
