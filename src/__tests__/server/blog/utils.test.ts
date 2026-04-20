import {
  extractFirstImage,
  replaceTokens,
  summarizeMarkdown,
  toSlug,
} from '@/server/blog/utils';

describe('blog utils', () => {
  it('creates stable slugs', () => {
    expect(toSlug('My First Post')).toBe('my-first-post');
    expect(toSlug('飛書 同步 架構')).toBe('飛書-同步-架構');
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
});
