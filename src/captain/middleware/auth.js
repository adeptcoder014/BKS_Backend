import jwt from 'jsonwebtoken';
import Captain from '../../models/merchantUser.js';
import * as redis from '../../services/redis.js';
import APIError from '../../utils/error.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({
      message: 'Authorization is required',
    });

  try {
    const payload = jwt.verify(token, process.env.CAPTAIN_JWT_SECRET);
    let captainData = await redis.getKey(`session_${payload.id}`, true);

    if (!captainData) {
      const captain = await Captain.findById(payload.id).lean();
      if (!captain) return res.status(401).json({ message: 'user not found' });

      captainData = captain;

      redis.storeKey(`session_${payload.id}`, captainData, 1);
    }

    req.user = captainData;

    return next();
  } catch (err) {
    if (err instanceof APIError) throw err;
    console.error(err);
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
}
