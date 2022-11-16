import { Router } from 'express';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/product.js';
import * as validation from '../validations/product.js';

const router = Router();

router.get('/data', controller.getData);
router.get('/hsn', controller.getHsnCodes);
router.get('/collections', controller.getCollections);

router
  .route('/')
  .get(controller.getProducts)
  .post(validate(validation.createProduct), controller.createProduct);

router
  .route('/:id')
  .get(controller.getProductById)
  .patch(validate(validation.updateProduct), controller.updateProduct)
  .delete(controller.deleteProduct);

export default router;
