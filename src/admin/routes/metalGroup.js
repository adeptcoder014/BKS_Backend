import { Router } from 'express';
import * as controller from '../controllers/metalGroup.js';
import validation from '../validations/metalGroup.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_metalGroup'), controller.getList);

router.post(
  '/create',
  checkPerm('create_metalGroup'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_metalGroup'), controller.getOneById)
  .patch(
    checkPerm('update_metalGroup'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_metalGroup'), controller.deleteOneById);

export default router;
