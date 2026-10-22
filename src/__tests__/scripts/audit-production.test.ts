/** @jest-environment node */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

import { runProductionAudit } from '../../../scripts/audit-production';

jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));
// The Node API overloads Buffer/string output; this fake covers its UTF-8 branch.
const run = jest.mocked(spawnSync) as unknown as jest.Mock<
  SpawnSyncReturns<string>
>;
const response = (high = 0, critical = 0, moderate = 0, low = 0, info = 0) =>
  JSON.stringify({
    advisories: {},
    metadata: { vulnerabilities: { high, critical, moderate, low, info } },
  });
const mockResult = (stdout: string, status: number | null = 0) =>
  run.mockReturnValue({
    stdout,
    status,
    stderr: '',
    pid: 1,
    output: [null, stdout, ''],
    signal: null,
  });
let stdout: jest.SpyInstance;
let stderr: jest.SpyInstance;
beforeEach(() => {
  stdout = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
  stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
});
afterEach(() => {
  stdout.mockRestore();
  stderr.mockRestore();
  run.mockReset();
});

it('accepts a valid clean report and keeps the production-only command', () => {
  mockResult(response());
  expect(runProductionAudit()).toBe(0);
  expect(run).toHaveBeenCalledWith(
    'corepack',
    ['pnpm', 'audit', '--prod', '--json'],
    expect.any(Object),
  );
});
it('reports high/critical findings separately from an audit service failure', () => {
  mockResult(response(1), 1);
  expect(runProductionAudit()).toBe(1);
  expect(stderr).toHaveBeenCalledWith(
    expect.stringContaining('vulnerabilities'),
  );
});
it('keeps the high/critical threshold without hiding moderate reports', () => {
  mockResult(response(0, 0, 1), 1);
  expect(runProductionAudit()).toBe(0);
  expect(stdout).toHaveBeenCalledWith(expect.stringContaining('1 moderate'));
});
it('accepts low/info-only reports below the requested gate threshold', () => {
  mockResult(response(0, 0, 0, 1, 1), 1);
  expect(runProductionAudit()).toBe(0);
});

it('fails closed on malformed, unavailable or unexplained audit results', () => {
  for (const [body, status] of [
    ['not json', 1],
    ['{"error":"offline"}', 1],
    [response(), null],
    [response(), 1],
  ] as const) {
    mockResult(body, status);
    expect(runProductionAudit()).toBe(2);
  }
  expect(stderr).toHaveBeenCalledWith(
    expect.stringContaining('service/tool failure'),
  );
});
