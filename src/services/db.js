import mongoose from 'mongoose';
import dotenv from 'dotenv';
import paginate from 'mongoose-paginate-v2';
import getters from 'mongoose-lean-getters';
import leanTransform from '../utils/leanTransform.js';
import logger from '../utils/logger.js';
import redis from './redis.js';

if (process.env.DOCKER != true) {
  dotenv.config();
}

paginate.paginate.options = {
  lean: { getters: true },
};

const transform = (doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  return ret;
};

mongoose.set('debug', true);
mongoose.set('returnOriginal', false);
mongoose.set('strictPopulate', true);
mongoose.set('strictQuery', 'throw');

mongoose.plugin(paginate);
mongoose.plugin(getters);
mongoose.plugin(leanTransform);

mongoose.set('toJSON', {
  getters: true,
  versionKey: false,
  minimize: false,
  transform,
});

mongoose.set('toObject', {
  getters: true,
  versionKey: false,
  minimize: false,
  transform,
});

export const connectMongoDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await import('../models/index.js');
  logger.info('MongoDB connected');
};

export const connectRedis = async () => {
  await redis.connect();

  logger.info('Redis connected');
};
