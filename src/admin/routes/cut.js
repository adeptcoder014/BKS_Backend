import { Router } from 'express';
import * as controller from '../controllers/cut.js';
import validation from '../validations/cut.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_cut'), controller.getList);

router.post(
  '/create',
  checkPerm('create_cut'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_cut'), controller.getOneById)
  .patch(
    checkPerm('update_cut'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_cut'), controller.deleteOneById);

export default router;
