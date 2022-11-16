import { Router } from 'express';
import * as controller from '../controllers/cyclePeriod.js';
import validation from '../validations/cyclePeriod.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';

const router = Router();

router.post('/list', checkPerm('view_cyclePeriod'), controller.getList);

router.post(
  '/create',
  checkPerm('create_cyclePeriod'),
  validate(validation.create),
  controller.create
);

router
  .route('/:id')
  .get(checkPerm('view_cyclePeriod'), controller.getOneById)
  .patch(
    checkPerm('update_cyclePeriod'),
    validate(validation.update),
    controller.updateOneById
  )
  .delete(checkPerm('delete_cyclePeriod'), controller.deleteOneById);

export default router;
