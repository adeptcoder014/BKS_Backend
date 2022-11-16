import jwt from 'jsonwebtoken';
import Business from '../../models/business.js';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({
      message: 'Authorization is required',
    });

  try {
    const payload = jwt.verify(token, process.env.BUSINESS_JWT_SECRET);
    let userData = await redis.getKey(`session_${payload.id}`, true);

    if (!userData) {
      const user = await Business.findById(payload.id).lean();

      if (!user) return res.status(401).json({ message: 'business not found' });

      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        image: user.image,
        businessType: user.businessType,
        gstNo: user.gstNo,
        pan: user.pan,
        aadhaar: user.aadhaar,
        bank: user.bank,
        deviceToken: user.deviceToken,
        isMpinRegistered: !!user.mpin,
        isWhatsapp: user.isWhatsapp,
        isVerified: user.isVerified,
      };

      redis.storeKey(`session_${payload.id}`, userData, 1);

      req.isFresh = true;
    }

    req.user = userData;

    if (!userData.isVerified)
      throw new APIError(
        'business is not verified',
        APIError.BUSINESS_NOT_VERIFIED
      );

    return next();
  } catch (err) {
    if (err instanceof APIError) throw err;
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
}
