// Bundles the API for `npm start`. Workspace packages (@greenscore/*) ship as TypeScript source,
// so they are bundled in; every other dependency stays external and is loaded from node_modules.
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@greenscore/'));

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
});

console.log('API built -> apps/api/dist/index.js');
