import { resolveArticleDates, syncFeishuArticles } from '@/server/blog/sync';

const REQUIRED_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_SPACE_ID',
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

  it('uses document create time as publishedAt when frontmatter date is missing', () => {
    const result = resolveArticleDates(undefined, {
      obj_create_time: '1776438597',
      obj_edit_time: '1776561839',
    });

    expect(result.publishedAt).toBe('2026-04-17T15:09:57.000Z');
    expect(result.updatedAt).toBe('2026-04-19T01:23:59.000Z');
  });

  it('prefers frontmatter date over document timestamps for publishedAt', () => {
    const result = resolveArticleDates('2026-04-01', {
      obj_create_time: '1776438597',
      obj_edit_time: '1776561839',
    });

    expect(result.publishedAt).toBe('2026-04-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-04-19T01:23:59.000Z');
  });
});
