import { Router } from 'express';
import fileupload from '../../utils/fileupload.js';
import validate from '../../utils/validate.js';
import * as controller from '../controllers/vehicle.js';
import * as validation from '../validations/vehicle.js';

const router = Router();

router
  .route('/')
  .get(controller.getVehicles)
  .post(
    fileupload.auto('image'),
    validate(validation.createVehicle),
    controller.createVehicle
  );

router
  .route('/:id')
  .get(controller.getVehicleById)
  .patch(
    fileupload.auto('image'),
    validate(validation.updateVehicle),
    controller.updateVehicle
  )
  .delete(controller.deleteVehicle);

export default router;
