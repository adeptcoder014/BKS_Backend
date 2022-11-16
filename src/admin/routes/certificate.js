import { Router } from 'express';
import * as controller from '../controllers/certificate.js';
import validation from '../validations/certificate.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_certificate'), controller.getList);

router.post(
  '/create',
  checkPerm('create_certificate'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_certificate'), controller.getOneById)
  .patch(
    checkPerm('update_certificate'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_certificate'), controller.deleteOneById);

export default router;
