import { normalizeStreamingMarkdown } from './normalizeStreamingMarkdown';

describe('normalizeStreamingMarkdown', () => {
  it('normalizes markdown headings without a space', () => {
    expect(normalizeStreamingMarkdown('##什么是 Agent？')).toBe(
      '## 什么是 Agent？',
    );
  });

  it('normalizes list and blockquote markers without a space', () => {
    expect(
      normalizeStreamingMarkdown(
        ['-感知', '1.推理', '>总结', '```md', '##raw', '```'].join('\n'),
      ),
    ).toBe(['- 感知', '1. 推理', '> 总结', '```md', '##raw', '```'].join('\n'));
  });

  it('does not rewrite fenced code block content', () => {
    expect(
      normalizeStreamingMarkdown(['```md', '##raw', '-item', '```'].join('\n')),
    ).toBe(['```md', '##raw', '-item', '```'].join('\n'));
  });
});
