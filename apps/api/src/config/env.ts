import { z } from 'zod';

/**
 * Environment configuration, validated once at startup so a bad config fails fast with a
 * readable message. Variables are documented in the repo-root `.env.example`.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'must start with mongodb:// or mongodb+srv://',
    ),
  /** Comma-separated browser origins allowed by CORS. */
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  ML_SERVICE_URL: z.url().default('http://localhost:8001'),
  /** MVP admin gate: a shared demo passcode, NOT real authentication. */
  ADMIN_PASSCODE: z.string().min(4).default('greenscore-admin'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Memoised accessor. Throws a readable error if the environment is invalid. */
export function getEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
      throw new Error(
        `Invalid environment configuration:\n${lines.join('\n')}\n` +
          'Copy .env.example to .env at the repo root and fill it in.',
      );
    }
    cached = result.data;
  }
  return cached;
}

export function getAllowedOrigins(env: Env = getEnv()): string[] {
  return env.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
