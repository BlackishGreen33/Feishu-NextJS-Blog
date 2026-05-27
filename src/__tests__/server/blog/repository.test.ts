import {
  ArticleIndex,
  ArticleSearchIndex,
  ArticleSummary,
} from '@/common/types/blog';
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
    const expectedFeatured = index.articles.filter(
      (article) => article.featured,
    );
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

describe('blog repository full-text search', () => {
  const makeArticle = (overrides: Partial<ArticleSummary>): ArticleSummary => ({
    id: overrides.id || overrides.slug || 'article',
    slug: overrides.slug || 'article',
    title: overrides.title || 'Article',
    summary: overrides.summary || 'Summary',
    cover: null,
    publishedAt: overrides.publishedAt || '2026-04-20T00:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-04-20T00:00:00.000Z',
    tags: overrides.tags || [],
    featured: overrides.featured || false,
    draft: overrides.draft || false,
    readingTimeMinutes: overrides.readingTimeMinutes || 1,
    sourceNodeToken: overrides.sourceNodeToken || overrides.slug || 'node',
    sourceDocumentId: overrides.sourceDocumentId || overrides.slug || 'doc',
  });

  const titleMatch = makeArticle({
    id: 'title-match',
    slug: 'title-match',
    title: 'Agent Search Guide',
    summary: 'Title weighted result',
    publishedAt: '2026-04-20T00:00:00.000Z',
  });
  const bodyMatch = makeArticle({
    id: 'body-match',
    slug: 'body-match',
    title: 'Weekly Notes',
    summary: 'Body weighted result',
    publishedAt: '2026-04-21T00:00:00.000Z',
  });
  const featuredTagMatch = makeArticle({
    id: 'featured-tag-match',
    slug: 'featured-tag-match',
    title: 'Cron Operations',
    summary: 'Featured search result',
    tags: [{ name: 'AI', slug: 'ai' }],
    featured: true,
    publishedAt: '2026-04-22T00:00:00.000Z',
  });
  const partialBodyMatch = makeArticle({
    id: 'partial-body-match',
    slug: 'partial-body-match',
    title: 'Runtime Only',
    summary: 'Should not match both terms',
    publishedAt: '2026-04-23T00:00:00.000Z',
  });

  const articleIndex: ArticleIndex = {
    generatedAt: '2026-04-23T00:00:00.000Z',
    source: 'feishu',
    articles: [partialBodyMatch, featuredTagMatch, bodyMatch, titleMatch],
  };

  const searchIndex: ArticleSearchIndex = {
    generatedAt: articleIndex.generatedAt,
    source: articleIndex.source,
    articles: [
      {
        ...titleMatch,
        tagNames: [],
        bodyText: 'This body mentions agent once.',
        searchableText:
          'agent search guide title weighted result this body mentions agent once.',
      },
      {
        ...bodyMatch,
        tagNames: [],
        bodyText: 'Deep runtime cache notes mention agent in the article body.',
        searchableText:
          'weekly notes body weighted result deep runtime cache notes mention agent in the article body.',
      },
      {
        ...featuredTagMatch,
        tagNames: ['AI'],
        bodyText: 'Cron task search content for production sync.',
        searchableText:
          'cron operations featured search result ai cron task search content for production sync.',
      },
      {
        ...partialBodyMatch,
        tagNames: [],
        bodyText: 'Runtime diagnostics without the paired keyword.',
        searchableText:
          'runtime only should not match both terms runtime diagnostics without the paired keyword.',
      },
    ],
  };

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/server/blog/storage', () => ({
      getBlogStorage: () => ({
        readIndex: jest.fn().mockResolvedValue(articleIndex),
        readSearchIndex: jest.fn().mockResolvedValue(searchIndex),
      }),
    }));
  });

  afterEach(() => {
    jest.dontMock('@/server/blog/storage');
  });

  it('finds body-only matches and returns a matched excerpt', async () => {
    const { listArticles } = await import('@/server/blog/repository');

    const result = await listArticles({ search: 'runtime cache' });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toEqual(
      expect.objectContaining({
        slug: 'body-match',
        matchedExcerpt: expect.stringContaining('runtime cache'),
      }),
    );
  });

  it('ranks title matches above body matches', async () => {
    const { listArticles } = await import('@/server/blog/repository');

    const result = await listArticles({ search: 'agent' });

    expect(result.posts[0]?.slug).toBe('title-match');
    expect(result.posts[1]?.slug).toBe('body-match');
  });

  it('combines tag, featured, and full-text filters', async () => {
    const { listArticles } = await import('@/server/blog/repository');

    const result = await listArticles({
      search: 'production',
      tag: 'ai',
      featured: true,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]?.slug).toBe('featured-tag-match');
  });

  it('keeps date sorting when no search query is provided', async () => {
    const { listArticles } = await import('@/server/blog/repository');

    const result = await listArticles({ page: 1, perPage: 2 });

    expect(result.posts.map((post) => post.slug)).toEqual([
      'partial-body-match',
      'featured-tag-match',
    ]);
  });
});
