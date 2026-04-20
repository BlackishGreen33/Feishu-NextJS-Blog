import { syncFeishuArticles } from '@/server/blog/sync';

const REQUIRED_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_ROOT_NODE_TOKEN',
] as const;

describe('syncFeishuArticles', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('skips gracefully when credentials are missing in optional mode', async () => {
    REQUIRED_KEYS.forEach((key) => {
      delete process.env[key];
    });

    const result = await syncFeishuArticles({ optional: true });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('Missing env');
  });
});
