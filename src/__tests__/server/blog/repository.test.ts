import { getArticleBySlug, listArticles } from '@/server/blog/repository';

describe('blog repository', () => {
  it('lists seeded articles', async () => {
    const result = await listArticles({ page: 1, perPage: 6 });

    expect(result.totalPosts).toBeGreaterThan(0);
    expect(result.posts[0]?.slug).toBe('feishu-sync-architecture');
  });

  it('filters featured articles', async () => {
    const result = await listArticles({ featured: true });

    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.every((article) => article.featured)).toBe(true);
  });

  it('gets article by slug', async () => {
    const article = await getArticleBySlug('feishu-sync-architecture');

    expect(article).not.toBeNull();
    expect(article?.content).toContain('飛書同步架構說明');
  });
});
