import jwt from 'jsonwebtoken';
import Merchant from '../../models/merchant.js';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({
      message: 'Authorization is required',
    });

  try {
    const payload = jwt.verify(token, process.env.MERCHANT_JWT_SECRET);
    let merchantData = await redis.getKey(`session_${payload.id}`, true);

    if (!merchantData) {
      const merchant = await Merchant.findById(payload.id).lean({
        getters: true,
      });

      if (!merchant)
        return res.status(401).json({ message: 'merchant not found' });

      merchantData = merchant;

      redis.storeKey(`session_${payload.id}`, merchantData, 1);

      req.isFresh = true;
    }

    req.user = merchantData;

    if (!merchantData.isVerified)
      throw new APIError(
        'account is not verified',
        APIError.ACCOUNT_NOT_VERIFIED,
        403
      );

    return next();
  } catch (err) {
    if (err instanceof APIError) throw err;
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
}
