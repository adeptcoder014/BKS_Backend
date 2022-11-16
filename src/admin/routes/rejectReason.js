import { Router } from 'express';
import * as controller from '../controllers/rejectReason.js';
import validation from '../validations/rejectReason.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_rejectReason'), controller.getList);

router.post(
  '/create',
  checkPerm('create_rejectReason'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_rejectReason'), controller.getOneById)
  .patch(
    checkPerm('update_rejectReason'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_rejectReason'), controller.deleteOneById);

export default router;
