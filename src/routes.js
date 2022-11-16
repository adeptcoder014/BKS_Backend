import { Router } from 'express';
import { handleDuplicateError } from './utils/util.js';
import APIError from './utils/error.js';

import adminRoutes from './admin/routes/index.js';
import customerRoutes from './customer/routes/index.js';
import captainRoutes from './captain/routes/index.js';
import businessRoutes from './business/routes/index.js';
import merchantRoutes from './merchant/routes/index.js';
import logger from './utils/logger.js';

const router = Router();

router.use((req, res, next) => {
  next();
  logger.info(`[${req.method}]: ${req.originalUrl}`);
  console.log(JSON.stringify(req.body, null, 2));
});

router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/captain', captainRoutes);
router.use('/business', businessRoutes);
router.use('/merchant', merchantRoutes);

router.use((err, req, res, next) => {
  if (err instanceof APIError) {
    console.log(err.toJSON());
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err.code === 11000) {
    return handleDuplicateError(err, req, res, next);
  }

  console.error(err);
  return res.status(500).json({
    message: err.message,
    stack: err.stack,
  });
});

router.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

export default router;
