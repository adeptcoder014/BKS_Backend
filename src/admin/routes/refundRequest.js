import { Router } from 'express';
import * as controller from '../controllers/refundRequest.js';
import validation from '../validations/refundRequest.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_refundRequest'), controller.getList);

router.post(
  '/create',
  checkPerm('create_refundRequest'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_refundRequest'), controller.getOneById)
  .patch(
    checkPerm('update_refundRequest'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_refundRequest'), controller.deleteOneById);

export default router;
