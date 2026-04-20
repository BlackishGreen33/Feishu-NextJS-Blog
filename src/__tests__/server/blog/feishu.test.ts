import { formatFeishuApiErrorMessage } from '@/server/blog/feishu';

describe('formatFeishuApiErrorMessage', () => {
  it('adds actionable guidance for wiki permission failures', () => {
    const message = formatFeishuApiErrorMessage(
      {
        code: 131006,
        msg: 'permission denied: wiki space permission denied, tenant needs read permission.',
        error: {
          log_id: 'log-123',
          troubleshooter: 'https://open.feishu.cn/search?...',
        },
      },
      { status: 400 },
    );

    expect(message).toContain('Feishu API error 400: code=131006');
    expect(message).toContain('Grant the app access to the target Feishu wiki space before syncing.');
    expect(message).toContain('log_id=log-123');
  });
});
