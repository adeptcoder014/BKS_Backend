import { Router } from 'express';
import * as controller from '../controllers/product.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', controller.getProducts);
router.get('/:id', controller.getProductById);
router.get(
  '/:id/addresses/:addressId',
  auth,
  controller.getProductDeliveryStatus
);

export default router;
