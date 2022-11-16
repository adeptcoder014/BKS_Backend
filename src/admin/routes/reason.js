import { Router } from 'express';
import * as controller from '../controllers/reason.js';
import validation from '../validations/reason.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_returnReason'), controller.getList);

router.post(
  '/create',
  checkPerm('create_returnReason'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_returnReason'), controller.getOneById)
  .patch(
    checkPerm('update_returnReason'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_returnReason'), controller.deleteOneById);

export default router;
