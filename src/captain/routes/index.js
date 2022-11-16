import { Router } from 'express';
import auth from '../middleware/auth.js';
import APIError from '../../utils/error.js';
import { createPreSignedUrl } from '../../services/s3.js';

import authRoutes from './auth.js';
import userRoutes from './user.js';
import deliveryRoutes from './delivery.js';
import returnRoutes from './return.js';
import verifierRoutes from './verifier.js';
import refinerRoutes from './refiner.js';
import accountingRoutes from './accounting.js';
import managerRoutes from './manager.js';

const router = Router();

router.use('/auth', authRoutes);

router.use(auth);

router.use('/users', userRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/return', returnRoutes);
router.use('/verifier', verifierRoutes);
router.use('/refiner', refinerRoutes);
router.use('/accounting', accountingRoutes);
router.use('/manager', managerRoutes);

router.post('/upload', async (req, res) => {
  if (!req.body.contentType) throw new APIError('contentType is required');
  const data = await createPreSignedUrl(req.body.contentType);
  res.status(201).json(data);
});

export default router;
