import { Router } from 'express';
import * as controller from '../controllers/upload.js';
import * as validation from '../validations/upload.js';
import validate from '../../utils/validate.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.post('/release', validate(validation.release), controller.releaseUpload);

export default router;
