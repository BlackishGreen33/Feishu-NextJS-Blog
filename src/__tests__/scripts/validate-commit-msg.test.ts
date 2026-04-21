const {
  TYPE_TO_EMOJI,
  validateCommitMessage,
} = require('../../../scripts/validate-commit-msg.js');

describe('validateCommitMessage', () => {
  it.each([
    '✨ feat(site): add featured article section',
    '🐛 fix(sync): avoid stale feishu cache reads',
    '📝 docs(repo): refresh contribution guide',
    '🔧 chore(repo): bump tooling',
    '🚀 ci(actions): add feishu sync workflow',
    '♻️ refactor(blog): simplify slug handling',
    '💄 style(ui): tighten article spacing',
    '✅ test(blog): cover missing article path',
    '⚡ perf(blog): cache rendered markdown',
    '⏪ revert(site): undo broken article layout',
    '▲ vercel(blog): adjust function limits',
  ])('accepts %s', (message) => {
    expect(validateCommitMessage(message)).toEqual({ valid: true });
  });

  it('rejects unsupported types', () => {
    expect(
      validateCommitMessage('🔥 hotfix(site): patch article route'),
    ).toEqual({
      valid: false,
      error: expect.stringContaining('Unsupported type "hotfix"'),
    });
  });

  it('rejects emoji and type mismatches', () => {
    expect(
      validateCommitMessage('✨ fix(sync): avoid stale feishu cache reads'),
    ).toEqual({
      valid: false,
      error: 'Type "fix" must use emoji "🐛", but received "✨".',
    });
  });

  it('rejects missing scope', () => {
    expect(
      validateCommitMessage('🐛 fix: avoid stale feishu cache reads'),
    ).toEqual({
      valid: false,
      error:
        'Commit message must match "<emoji> <type>(<scope>): <desc>" with lowercase type and scope.',
    });
  });

  it('keeps the mapping exhaustive for allowed types', () => {
    expect(TYPE_TO_EMOJI).toMatchInlineSnapshot(`
      {
        "chore": "🔧",
        "ci": "🚀",
        "docs": "📝",
        "feat": "✨",
        "fix": "🐛",
        "perf": "⚡",
        "refactor": "♻️",
        "revert": "⏪",
        "style": "💄",
        "test": "✅",
        "vercel": "▲",
      }
    `);
  });
});
