import { Router } from 'express';
import * as controller from '../controllers/cart.js';
import * as validation from '../validations/cart.js';
import auth from '../middleware/auth.js';
import validate from '../../utils/validate.js';

const router = Router();

router.use(auth);

router.get('/', controller.getCart);

router
  .route('/items')
  .post(validate(validation.addItem), controller.addItem)
  .patch(controller.updateBulkItems);

router
  .route('/items/:itemId')
  .patch(validate(validation.updateItem), controller.updateItem)
  .delete(controller.deleteItem);

export default router;
