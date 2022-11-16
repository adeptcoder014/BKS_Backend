import { Router } from 'express';
import * as controller from '../controllers/policy.js';
import validation from '../validations/policy.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_policy'), controller.getList);

router.post(
  '/create',
  checkPerm('create_policy'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_policy'), controller.getOneById)
  .patch(
    checkPerm('update_policy'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_policy'), controller.deleteOneById);

export default router;
