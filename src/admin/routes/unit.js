import { Router } from 'express';
import * as controller from '../controllers/unit.js';
import validation from '../validations/unit.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_unit'), controller.getList);

router.post(
  '/create',
  checkPerm('create_unit'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_unit'), controller.getOneById)
  .patch(
    checkPerm('update_unit'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_unit'), controller.deleteOneById);

export default router;
