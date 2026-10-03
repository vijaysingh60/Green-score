import { createApp } from './app';
import { connectDatabase, disconnectDatabase, ensureIndexes } from './config/database';
import { getEnv } from './config/env';
import { logger } from './utils/logger';
import './models'; // register every model (and its indexes) before connecting

async function main(): Promise<void> {
  const env = getEnv();

  await connectDatabase(env.MONGODB_URI);
  await ensureIndexes();

  const server = createApp().listen(env.API_PORT, () => {
    logger.info(`API listening on http://localhost:${env.API_PORT}`);
  });

  let closing = false;
  const shutdown = (signal: string): void => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received: shutting down`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(() => {
      disconnectDatabase()
        .catch((error) => logger.error('Error while closing MongoDB', error))
        .finally(() => process.exit(0));
    });
    server.closeIdleConnections();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error(error instanceof Error ? error.message : 'Failed to start the API', error);
  process.exit(1);
});
