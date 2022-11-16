import { Router } from 'express';
import * as controller from '../controllers/subscription.js';
import validation from '../validations/subscription.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_subscription'), controller.getList);

router.post(
  '/create',
  checkPerm('create_subscription'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_subscription'), controller.getOneById)
  .patch(
    checkPerm('update_subscription'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_subscription'), controller.deleteOneById);

export default router;
