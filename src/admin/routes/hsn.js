import { Router } from 'express';
import * as controller from '../controllers/hsn.js';
import validation from '../validations/hsn.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_colour'), controller.getList);

router.post(
  '/create',
  checkPerm('create_colour'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_colour'), controller.getOneById)
  .patch(
    checkPerm('update_colour'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_colour'), controller.deleteOneById);

export default router;
