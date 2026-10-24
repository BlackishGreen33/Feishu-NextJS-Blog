import { spawnSync } from 'node:child_process';
import path from 'node:path';

it('renders actual sanitized, highlighted article content through installed packages', () => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('tsx/cli'),
      path.resolve('scripts/fixtures/article-rendering.tsx'),
    ],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 30000 },
  );
  expect(result.stderr).toBe('');
  expect(result.stdout).toContain('article rendering verified');
  expect(result.status).toBe(0);
});
