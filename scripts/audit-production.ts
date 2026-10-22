import { spawnSync } from 'node:child_process';
import { z } from 'zod';

const count = z.number().int().nonnegative();
const reportSchema = z.looseObject({
  advisories: z.record(
    z.string(),
    z.looseObject({
      module_name: z.string(),
      severity: z.string(),
      url: z.string(),
    }),
  ),
  metadata: z.looseObject({
    vulnerabilities: z.looseObject({
      high: count,
      critical: count,
      moderate: count,
      low: count,
      info: count,
    }),
  }),
});

export const runProductionAudit = (): number => {
  const result = spawnSync('corepack', ['pnpm', 'audit', '--prod', '--json'], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  try {
    if (
      result.error ||
      result.signal ||
      (result.status !== 0 && result.status !== 1)
    )
      throw new Error('Audit process failed');
    const report = reportSchema.parse(JSON.parse(result.stdout) as unknown);
    const { high, critical, moderate, low, info } =
      report.metadata.vulnerabilities;
    // A nonzero command with no reported vulnerabilities is not a clean scan.
    if (result.status !== 0 && high + critical + moderate + low + info === 0)
      throw new Error('Unexplained audit status');
    const summary = `${high} high, ${critical} critical, ${moderate} moderate, ${low} low, ${info} info`;
    for (const advisory of Object.values(report.advisories)) {
      process.stdout.write(
        `${advisory.severity}: ${advisory.module_name} ${advisory.url}\n`,
      );
    }
    if (high || critical) {
      process.stderr.write(`Security vulnerabilities: ${summary}\n`);
      return 1;
    }
    process.stdout.write(
      `Production audit passed the high/critical threshold: ${summary}\n`,
    );
    return 0;
  } catch {
    process.stderr.write(
      `Audit service/tool failure (exit=${String(result.status)}); no valid security result.\n`,
    );
    return 2;
  }
};

if (require.main === module) process.exitCode = runProductionAudit();
