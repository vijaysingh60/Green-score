import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { getAllowedOrigins } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiRouter } from './routes';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: getAllowedOrigins() }));
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`));
    next();
  });

  app.get('/', (_req, res) => {
    res.json({ service: 'greenscore-api', docs: 'see docs/api-contract.md', health: '/api/health' });
  });
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
