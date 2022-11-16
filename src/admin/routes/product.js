import { Router } from 'express';
import * as controller from '../controllers/product.js';
import validation from '../validations/product.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_product'), controller.getList);

router.post(
  '/create',
  checkPerm('create_product'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_product'), controller.getOneById)
  .patch(
    checkPerm('update_product'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_product'), controller.deleteOneById);

export default router;
