/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.join(process.cwd(), 'scripts/check-pr-gate.mjs');
const success = {
  quality: { result: 'success' },
  test: { result: 'success' },
  build: { result: 'success' },
  security: { result: 'success' },
};
const run = (results: unknown) =>
  spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { NODE_ENV: 'test', JOB_RESULTS: JSON.stringify(results) },
  });

it('only passes when every required job actually succeeded', () => {
  expect(run(success).status).toBe(0);
  for (const result of ['failure', 'cancelled', 'skipped', 'neutral']) {
    expect(run({ ...success, build: { result } }).status).toBe(1);
  }
  expect(
    run({ quality: success.quality, test: success.test, build: success.build })
      .status,
  ).toBe(1);
  expect(run(null).status).toBe(1);
});
