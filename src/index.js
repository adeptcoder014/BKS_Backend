import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import boot from './utils/boot.js';
import routes from './routes.js';
import logger from './utils/logger.js';

const app = express();

app.set('reverse proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: '*',
  })
);
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(routes);

async function start() {
  await boot();
  import('./test.js');

  app.listen(process.env.PORT, () => {
    logger.info(`API is listening on port ${process.env.PORT}`);
  });
}

start();

export default app;
