import { Router } from 'express';
import * as controller from '../controllers/interest.js';
import validation from '../validations/interest.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_interest'), controller.getList);

router.post(
  '/create',
  checkPerm('create_interest'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_interest'), controller.getOneById)
  .patch(
    checkPerm('update_interest'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_interest'), controller.deleteOneById);

export default router;
