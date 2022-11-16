import { Router } from 'express';
import * as controller from '../controllers/sellRequest.js';
import validation from '../validations/sellRequest.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_sellRequest'), controller.getList);

router.post(
  '/create',
  checkPerm('create_sellRequest'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_sellRequest'), controller.getOneById)
  .patch(
    checkPerm('update_sellRequest'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_sellRequest'), controller.deleteOneById);

export default router;
