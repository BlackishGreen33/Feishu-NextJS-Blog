import {
  ensureUniqueSlug,
  extractFirstImage,
  mapWithConcurrency,
  replaceTokens,
  stripLeadingHeading,
  summarizeMarkdown,
  toSlug,
} from '@/server/blog/utils';

describe('blog utils', () => {
  it('keeps bounded concurrency, result order and failure propagation', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapWithConcurrency([3, 1, 2], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(result).toEqual([6, 2, 4]);
    expect(peak).toBe(2);
    await expect(
      mapWithConcurrency([1], 2, () =>
        Promise.reject(new Error('source failure')),
      ),
    ).rejects.toThrow('source failure');
  });
  it('creates stable slugs', () => {
    expect(toSlug('My First Post')).toBe('my-first-post');
    expect(toSlug('飛書 同步 架構')).toBe('飛書-同步-架構');
  });

  it('keeps incrementing when a slug and its first fallback are reserved', () => {
    const reserved = new Set(['article', 'article-node-1']);

    expect(ensureUniqueSlug('article', 'node-1', reserved)).toBe(
      'article-node-1-2',
    );
  });

  it('summarizes markdown content', () => {
    const summary = summarizeMarkdown(
      '# Title\n\nThis is a markdown paragraph with **formatting**.',
      20,
    );

    expect(summary).toBe('Title This is a mark...');
  });

  it('extracts the first image from markdown and html', () => {
    expect(extractFirstImage('![cover](https://example.com/cover.png)')).toBe(
      'https://example.com/cover.png',
    );
    expect(
      extractFirstImage(
        '<p>hello</p><img src="https://example.com/image.jpg" alt="demo" />',
      ),
    ).toBe('https://example.com/image.jpg');
  });

  it('replaces tokenized links', () => {
    const content = '[read](wikcn123) and <img src="img-token" />';
    const replaced = replaceTokens(content, {
      wikcn123: '/blog/hello-world',
      'img-token': '/feishu-assets/image.png',
    });

    expect(replaced).toContain('/blog/hello-world');
    expect(replaced).toContain('/feishu-assets/image.png');
  });

  it('strips a duplicated leading h1 when it matches the article title', () => {
    const content = '# 团队工作周报\n\n## 本周总结\n\n内容';

    expect(stripLeadingHeading(content, '团队工作周报')).toBe(
      '## 本周总结\n\n内容',
    );
  });
});
