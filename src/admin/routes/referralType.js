import { Router } from 'express';
import * as controller from '../controllers/referralType.js';
import validation from '../validations/referralType.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_referralType'), controller.getList);

router.post(
  '/create',
  checkPerm('create_referralType'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_referralType'), controller.getOneById)
  .patch(
    checkPerm('update_referralType'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_referralType'), controller.deleteOneById);

export default router;
