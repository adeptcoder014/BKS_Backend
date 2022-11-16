import { Router } from 'express';
import * as controller from '../controllers/referral.js';
import validation from '../validations/referral.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_referral'), controller.getList);

router.post(
  '/create',
  checkPerm('create_referral'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_referral'), controller.getOneById)
  .patch(
    checkPerm('update_referral'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_referral'), controller.deleteOneById);

export default router;
