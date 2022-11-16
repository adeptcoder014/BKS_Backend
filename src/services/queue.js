import Queue from 'bull';
import redis from 'redis';

const queue = new Queue('tasks', {
  redis,
});

export default queue;
