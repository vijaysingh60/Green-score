import dns from 'node:dns';
import mongoose from 'mongoose';
import type { HealthStatus } from '@greenscore/types';
import { logger } from '../utils/logger';

/**
 * Reusable MongoDB connection module (Mongoose).
 *
 * - `connectDatabase` retries a few times so `docker compose up` / a slow local mongod does not
 *   crash the API on a cold start, then throws so the caller can exit with a clear message.
 * - `disconnectDatabase` is used by graceful shutdown.
 * - Indexes are built from the schemas (Mongoose `autoIndex`) when models are first used.
 */

export interface ConnectOptions {
  retries?: number;
  retryDelayMs?: number;
}

let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', error));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Atlas `mongodb+srv://` URIs need a DNS SRV lookup. Some networks (hotel / campus / hackathon
 * Wi-Fi, some routers) can't resolve SRV records and fail with `querySrv ECONNREFUSED`. For those
 * we point Node's resolver at a public DNS server. Only applies to `+srv` URIs.
 *
 * Override with MONGODB_DNS_SERVERS (comma-separated, default "8.8.8.8"); set it empty to disable.
 */
function applyDnsOverride(uri: string): void {
  if (!uri.startsWith('mongodb+srv://')) return;
  const servers = (process.env.MONGODB_DNS_SERVERS ?? '8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers.length === 0) return;
  try {
    dns.setServers(servers);
    logger.info(`Using DNS servers ${servers.join(', ')} to resolve the MongoDB SRV record`);
  } catch (error) {
    logger.warn(`Ignoring invalid MONGODB_DNS_SERVERS: ${error instanceof Error ? error.message : error}`);
  }
}

export async function connectDatabase(
  uri: string,
  { retries = 3, retryDelayMs = 2000 }: ConnectOptions = {},
): Promise<void> {
  attachListeners();
  applyDnsOverride(uri);
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      const { host, name } = mongoose.connection;
      logger.info(`MongoDB connected: ${host}/${name}`); // never log the URI: it may hold credentials
      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`MongoDB connection attempt ${attempt}/${retries} failed: ${reason}`);
      if (attempt === retries) {
        throw new Error(
          `Could not connect to MongoDB after ${retries} attempts. ` +
            'Check MONGODB_URI and that MongoDB is running (docker compose up -d mongo, or npm run db:local).',
          { cause: error },
        );
      }
      await sleep(retryDelayMs);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}

const READY_STATES: Record<number, HealthStatus['database']> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getDatabaseState(): HealthStatus['database'] {
  return READY_STATES[mongoose.connection.readyState] ?? 'disconnected';
}

/** Build every model's indexes now (used by the seed script and tests). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}
