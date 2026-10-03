import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// One shared .env at the repo root (the API reads it too). Next only reads apps/web by default.
const repoRoot = path.resolve(process.cwd(), '../..');
loadEnvConfig(repoRoot);

const config: NextConfig = {
  reactStrictMode: true,
  // Don't auto-generate AGENTS.md / CLAUDE.md files into the repo on `next dev`.
  agentRules: false,
  // Workspace packages ship as TypeScript source.
  transpilePackages: ['@greenscore/ui', '@greenscore/shared', '@greenscore/types'],
  turbopack: { root: repoRoot },
};

export default config;
