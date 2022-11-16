import { Router } from 'express';
import * as controller from '../controllers/customDuty.js';
import validation from '../validations/customDuty.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_customDuty'), controller.getList);

router.post(
  '/create',
  checkPerm('create_customDuty'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_customDuty'), controller.getOneById)
  .patch(
    checkPerm('update_customDuty'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_customDuty'), controller.deleteOneById);

export default router;
