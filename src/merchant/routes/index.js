import { Router } from 'express';
import auth from '../middleware/auth.js';
import { createPreSignedUrl } from '../../services/s3.js';
import APIError from '../../utils/error.js';

import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import custodyRoutes from './custody.js';
import userRoutes from './user.js';
import orderRoutes from './order.js';
import productRoutes from './product.js';
import productTypeRoutes from './productType.js';
import makingChargeRoutes from './makingCharge.js';
import vehicleRoutes from './vehicle.js';
import faqRoutes from './faq.js';
import trackRoutes from './track.js';

const router = Router();

router.post('/upload', async (req, res) => {
  if (!req.body.contentType) throw new APIError('contentType is required');
  const data = await createPreSignedUrl(req.body.contentType);
  res.status(201).json(data);
});

router.use('/auth', authRoutes);
router.use(auth);

router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/custody', custodyRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/making-charges', makingChargeRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/faqs', faqRoutes);
router.use('/track', trackRoutes);

export default router;
