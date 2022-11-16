import { Router } from 'express';
import * as controller from '../controllers/setting.js';
import validation from '../validations/setting.js';
import validate from '../../utils/validate.js';
import { checkPerm } from '../middleware/auth.js';
import fileupload from '../../utils/fileupload.js';

const router = Router();

router.get('/', checkPerm('view_setting'), controller.getOneById);

router.post(
  '/',
  checkPerm('update_setting'),
  fileupload.auto(['organizationLogo', 'organizationSignature']),
  validate(validation.update),
  controller.update
);

export default router;
