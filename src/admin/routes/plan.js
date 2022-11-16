import { Router } from 'express';
import * as controller from '../controllers/plan.js';
import validation from '../validations/plan.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_plan'), controller.getList);

router.post(
  '/create',
  checkPerm('create_plan'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_plan'), controller.getOneById)
  .patch(
    checkPerm('update_plan'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_plan'), controller.deleteOneById);

export default router;
