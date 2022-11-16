import jwt from 'jsonwebtoken';
import User from '../../models/user.js';
import Gateway from '../../services/gateway.js';
import * as redis from '../../services/redis.js';
import { userTypes } from '../../utils/constants.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({
      message: 'Authorization is required',
    });

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    let userData = await redis.getKey(`session_${payload.id}`, true);

    if (!userData) {
      const [user, [wallet]] = await Promise.all([
        User.findById(payload.id)
          .lean()
          .select(
            'fullName email mobile userType deviceToken isWhatsapp isVerified role'
          )
          .populate('role'),
        false
          ? Gateway.evaluateTransaction(
              'Find',
              JSON.stringify({
                userId: payload.id,
              })
            )
          : [],
      ]);

      if (!user) return res.status(401).json({ message: 'user not found' });
      if (user.userType !== userTypes.ADMIN) return res.sendStatus(403);

      userData = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
        deviceToken: user.deviceToken,
        isWhatsapp: user.isWhatsapp,
        isVerified: user.isVerified,
        email: wallet?.email,
        mobile: wallet?.mobile,
        role: user.role,
      };

      redis.storeKey(`session_${payload.id}`, userData, 1);

      req.isFresh = true;
      req.wallet = wallet;
    }

    req.user = userData;

    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: 'Invalid token',
    });
  }

  next();
}

export const checkPerm = (permission) => {
  return (req, res, next) => {
    return next();
    if (!req.user?.role) return res.sendStatus(403);
    if (req.user.role.permissions.includes(permission)) return next();

    res.sendStatus(403);
  };
};
