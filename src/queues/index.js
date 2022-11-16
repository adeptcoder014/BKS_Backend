import fs from 'fs';
import queue from '../services/queue.js';
import logger from '../utils/logger.js';

export default async function loadQueues() {
  const files = fs
    .readdirSync('./src/queues')
    .filter((file) => file !== 'index.js');

  const promises = [];

  for (const file of files) {
    const fn = async () => {
      const queueName = file.split('.')[0];
      const queueFn = (await import(`./${file}`)).default;
      queue.process(queueName, queueFn);
    };

    promises.push(fn());
  }

  await Promise.all(promises);
  logger.info('Loaded queues');
}
