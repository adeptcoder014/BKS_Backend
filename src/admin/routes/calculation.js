import { Router } from 'express';
import * as controller from '../controllers/calculation.js';
import validation from '../validations/calculation.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_calculation'), controller.getList);

router.post(
  '/create',
  checkPerm('create_calculation'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_calculation'), controller.getOneById)
  .patch(
    checkPerm('update_calculation'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_calculation'), controller.deleteOneById);

export default router;
