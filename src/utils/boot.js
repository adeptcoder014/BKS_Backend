import dotenv from 'dotenv';
import dayjs from 'dayjs';
import customFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import { connectToFabric } from '../services/gateway.js';
import { connectMongoDB, connectRedis } from '../services/db.js';
import './patchExpress.js';
import { loadApplicationData } from '../services/application.js';
import loadQueues from '../queues/index.js';

dotenv.config();

dayjs.extend(customFormat);
dayjs.extend(timezone);
dayjs.extend(isBetween);

dayjs.tz.setDefault('Asia/Kolkata');

const boot = async () => {
  await connectMongoDB();
  await connectRedis();
  // await connectToFabric();
  await loadApplicationData();
  await loadQueues();
};

export default boot;
