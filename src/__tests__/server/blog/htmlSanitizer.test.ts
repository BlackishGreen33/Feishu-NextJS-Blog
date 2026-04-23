import {
  commentHtmlSanitizeSchema,
  feishuHtmlSanitizeSchema,
} from '@/common/libs/htmlSanitizer';

describe('content sanitize schemas', () => {
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
