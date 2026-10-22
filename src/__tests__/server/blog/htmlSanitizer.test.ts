import {
  commentHtmlSanitizeSchema,
  feishuHtmlSanitizeSchema,
} from '@/common/libs/htmlSanitizer';

describe('content sanitize schemas', () => {
  it('sanitizes actual nested HTML through the installed unified pipeline', () => {
    const result = spawnSync(
      process.execPath,
      [
        require.resolve('tsx/cli'),
        '--eval',
        `
      import assert from 'node:assert/strict';
      import { sanitizeCommentList } from './src/server/blog/htmlSanitizer';
      void sanitizeCommentList([{ body_html: '<p>safe<script>bad()</script><a href="javascript:bad()" onclick="bad()">link</a></p>', children: [{ body_html: '<p><a href="https://example.com" onclick="bad()">child</a></p>' }] }]).then(([item]) => {
        assert.equal(item.body_html, '<p>safe<a>link</a></p>');
        assert.equal(item.children[0].body_html, '<p><a href="https://example.com">child</a></p>');
      });
    `,
      ],
      { encoding: 'utf8', cwd: process.cwd(), timeout: 15000 },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
  it('keeps Feishu-specific layout attributes on the markdown schema', () => {
    expect(feishuHtmlSanitizeSchema.tagNames).toEqual(
      expect.arrayContaining(['div', 'img', 'input', 'table']),
    );
    expect(feishuHtmlSanitizeSchema.attributes?.div).toEqual(
      expect.arrayContaining(['column-size', 'width-ratio']),
    );
    expect(feishuHtmlSanitizeSchema.attributes?.img).toEqual(
      expect.arrayContaining(['align', 'src-width', 'src-height']),
    );
    expect(feishuHtmlSanitizeSchema.attributes?.input).toEqual(
      expect.arrayContaining([
        ['disabled', true],
        ['type', 'checkbox'],
      ]),
    );
  });

  it('limits comment HTML to a smaller allowlist', () => {
    expect(commentHtmlSanitizeSchema.tagNames).toEqual(
      expect.arrayContaining(['a', 'blockquote', 'code', 'p', 'pre', 'ul']),
    );
    expect(commentHtmlSanitizeSchema.tagNames).not.toEqual(
      expect.arrayContaining(['div', 'img', 'iframe', 'script', 'style']),
    );
    expect(commentHtmlSanitizeSchema.attributes).toEqual({
      a: ['href'],
    });
    expect(commentHtmlSanitizeSchema.strip).toEqual(
      expect.arrayContaining(['iframe', 'script', 'style']),
    );
    expect(commentHtmlSanitizeSchema.protocols?.href).toEqual(
      expect.arrayContaining(['http', 'https', 'mailto']),
    );
  });
});
import { spawnSync } from 'node:child_process';
