import { Router } from 'express';
import * as controller from '../controllers/faq.js';
import validation from '../validations/faq.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_faq'), controller.getList);

router.post(
  '/create',
  checkPerm('create_faq'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_faq'), controller.getOneById)
  .patch(
    checkPerm('update_faq'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_faq'), controller.deleteOneById);

export default router;
