import fs from 'fs';
import path from 'path';

describe('Feishu Sync workflow', () => {
  it('limits scheduled syncs to four runs per day', () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), '.github', 'workflows', 'feishu-sync.yml'),
      'utf8',
    );
    const schedules = [
      ...workflow.matchAll(/^\s*-\s+cron:\s+['"]([^'"]+)['"]\s*$/gm),
    ].map(([, schedule]) => schedule);

    expect(schedules).toEqual(['17 */6 * * *']);
    expect(workflow).toContain('--retry-max-time 300');
    expect(workflow).not.toContain('--retry-delay');
  });

  it('routes delayed sync messages to a private queue consumer', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'),
    ) as {
      functions?: Record<
        string,
        { experimentalTriggers?: Array<Record<string, unknown>> }
      >;
    };

    expect(
      config.functions?.['src/pages/api/queues/feishu-sync.ts']
        ?.experimentalTriggers,
    ).toContainEqual({
      type: 'queue/v2beta',
      topic: 'feishu-sync',
      retryAfterSeconds: 60,
    });
  });
});
