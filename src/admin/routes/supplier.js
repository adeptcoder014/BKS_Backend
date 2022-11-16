import { Router } from 'express';
import * as controller from '../controllers/supplier.js';
import validation from '../validations/supplier.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_supplier'), controller.getList);

router.post(
  '/create',
  checkPerm('create_supplier'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_supplier'), controller.getOneById)
  .patch(
    checkPerm('update_supplier'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_supplier'), controller.deleteOneById);

export default router;
