/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

it('reuses the active package manager with an empty offline Corepack cache and hides credentials', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-launcher-'));
  const tmp = path.join(root, 'tmp');
  const corepack = path.join(root, 'corepack');
  try {
    for (const name of [
      'src',
      'scripts',
      'data',
      'public',
      'patches',
      'node_modules',
      'tmp',
      'corepack',
    ]) {
      fs.mkdirSync(path.join(root, name));
    }
    for (const name of [
      'pnpm-lock.yaml',
      'tsconfig.json',
      'next.config.js',
      'next-sitemap.config.js',
      'postcss.config.js',
      'tailwind.config.js',
    ]) {
      fs.writeFileSync(path.join(root, name), '{}');
    }
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@10.32.1' }),
    );
    const packageManager = path.join(root, 'pnpm.cjs');
    fs.writeFileSync(
      packageManager,
      `const assert = require('node:assert/strict');
assert.deepEqual(process.argv.slice(2), ['run', 'build']);
assert.equal(process.env.SMOKE_PRIVATE_ENV, undefined);
assert.equal(process.env.COREPACK_ENABLE_NETWORK, '0');
process.stdout.write('ACTIVE_PNPM_EXECUTED\\n');
process.exit(17);
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        require.resolve('tsx/cli'),
        '--tsconfig',
        path.join(process.cwd(), 'tsconfig.json'),
        path.join(process.cwd(), 'scripts/smoke-build.ts'),
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 15_000,
        env: {
          NODE_ENV: 'production',
          PATH: process.env.PATH,
          TMPDIR: tmp,
          TEMP: tmp,
          TMP: tmp,
          COREPACK_HOME: corepack,
          COREPACK_ENABLE_NETWORK: '0',
          npm_execpath: packageManager,
          SMOKE_PRIVATE_ENV: 'fixture-private-value',
        },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('ACTIVE_PNPM_EXECUTED');
    expect(result.stderr).toContain('Child process failed: 17');
    expect(
      fs
        .readdirSync(tmp)
        .filter((name) => name.startsWith('blog-production-smoke-')),
    ).toEqual([]);
    expect(fs.readdirSync(corepack)).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
