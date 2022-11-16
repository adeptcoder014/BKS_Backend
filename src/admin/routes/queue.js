import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import queue from '../../services/queue.js';

const router = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queue');

createBullBoard({
  queues: [new BullAdapter(queue)],
  serverAdapter: serverAdapter,
});

router.use(serverAdapter.getRouter());

export default router;
