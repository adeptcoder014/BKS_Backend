import { Router } from 'express';
import * as controller from '../controllers/faq.js';

const router = Router();

router.get('/', controller.getFaqs);

export default router;
