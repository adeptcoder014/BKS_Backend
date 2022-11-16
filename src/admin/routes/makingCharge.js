import { Router } from 'express';
import * as controller from '../controllers/makingCharge.js';
import validation from '../validations/makingCharge.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_makingCharge'), controller.getList);

router.post(
  '/create',
  checkPerm('create_makingCharge'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_makingCharge'), controller.getOneById)
  .patch(
    checkPerm('update_makingCharge'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_makingCharge'), controller.deleteOneById);

export default router;
