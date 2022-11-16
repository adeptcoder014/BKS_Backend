import { Router } from 'express';
import * as controller from '../controllers/collection.js';
import validation from '../validations/collection.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_collection'), controller.getList);

router.post(
  '/create',
  checkPerm('create_collection'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_collection'), controller.getOneById)
  .patch(
    checkPerm('update_collection'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_collection'), controller.deleteOneById);

export default router;
