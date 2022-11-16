import { Router } from 'express';
import * as controller from '../controllers/delivery.js';
import validation from '../validations/delivery.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_delivery'), controller.getList);

router.post(
  '/create',
  checkPerm('create_delivery'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_delivery'), controller.getOneById)
  .patch(
    checkPerm('update_delivery'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_delivery'), controller.deleteOneById);

export default router;
