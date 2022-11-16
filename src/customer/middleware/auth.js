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
    const payload = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET);
    let userData = await redis.getKey(`session_${payload.id}`, true);

    if (!userData) {
      const user = await User.findById(payload.id).lean();

      if (!user) return res.status(401).json({ message: 'user not found' });
      if (user.userType !== userTypes.CUSTOMER) return res.sendStatus(403);

      userData = user;

      redis.storeKey(`session_${payload.id}`, user, 1);

      req.isFresh = true;
      // req.wallet = wallet;
    }

    req.user = userData;

    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
}
