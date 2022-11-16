import { Router } from 'express';
import * as controller from '../controllers/role.js';
import validation from '../validations/role.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_role'), controller.getList);

router.post(
  '/create',
  checkPerm('create_role'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_role'), controller.getOneById)
  .patch(
    checkPerm('update_role'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_role'), controller.deleteOneById);

export default router;
