import { Router } from 'express';
import * as controller from '../controllers/productType.js';
import * as validation from '../validations/productType.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.use(auth);

router
  .route('/')
  .get(controller.getProductTypes)
  .post(
    fileupload.auto('image'),
    validate(validation.createProductType),
    controller.createProductType
  );

router
  .route('/:id')
  .get(controller.getProductTypeById)
  .patch(
    fileupload.auto('image'),
    validate(validation.updateProductType),
    controller.updateProductType
  )
  .delete(controller.deleteProductType);

export default router;
