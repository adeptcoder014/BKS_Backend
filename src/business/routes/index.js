import { Router } from 'express';
import auth from '../middleware/auth.js';

import authRoutes from './auth.js';
import userRoutes from './user.js';

const router = Router();

router.use('/auth', authRoutes);

router.use(auth);

router.use('/users', userRoutes);

export default router;
