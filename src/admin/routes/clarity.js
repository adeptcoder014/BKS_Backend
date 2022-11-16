import { Router } from 'express';
import * as controller from '../controllers/clarity.js';
import validation from '../validations/clarity.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_clarity'), controller.getList);

router.post(
  '/create',
  checkPerm('create_clarity'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_clarity'), controller.getOneById)
  .patch(
    checkPerm('update_clarity'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_clarity'), controller.deleteOneById);

export default router;
