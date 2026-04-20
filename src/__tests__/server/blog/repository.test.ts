import {
  getArticleBySlug,
  getArticleIndex,
  listArticles,
} from '@/server/blog/repository';

describe('blog repository', () => {
  it('lists available articles', async () => {
    const result = await listArticles({ page: 1, perPage: 6 });

    expect(result.totalPosts).toBeGreaterThan(0);
    expect(result.posts[0]?.slug).toBeTruthy();
  });

  it('filters featured articles', async () => {
    const index = await getArticleIndex(false);
    const expectedFeatured = index.articles.filter((article) => article.featured);
    const result = await listArticles({ featured: true });

    expect(result.totalPosts).toBe(expectedFeatured.length);
    expect(result.posts.every((article) => article.featured)).toBe(true);
  });

  it('gets article by slug', async () => {
    const index = await getArticleIndex(false);
    const firstArticle = index.articles[0];
    expect(firstArticle).toBeDefined();

    const article = await getArticleBySlug(firstArticle!.slug);

    expect(article).not.toBeNull();
    expect(article?.slug).toBe(firstArticle!.slug);
    expect(article?.content.length).toBeGreaterThan(0);
  });
});
