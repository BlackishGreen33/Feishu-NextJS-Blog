import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/blog';
import { getFeaturedArticles, listArticles } from '@/server/blog/repository';

jest.mock('@/server/blog/repository', () => ({
  getFeaturedArticles: jest.fn(),
  listArticles: jest.fn(),
}));

const mockedGetFeaturedArticles = jest.mocked(getFeaturedArticles);
const mockedListArticles = jest.mocked(listArticles);

type MockApiResponse = NextApiResponse & {
  headers: Record<string, string>;
  statusCode: number;
  payload: unknown;
};

const createMockResponse = () => {
  const response = {} as MockApiResponse;

  response.headers = {};
  response.statusCode = 200;
  response.payload = undefined;
  response.setHeader = jest.fn(
    (name: string, value: string | number | readonly string[]) => {
      response.headers[name] = Array.isArray(value)
        ? value.join(',')
        : String(value);
      return response;
    },
  );
  response.status = jest.fn((code: number) => {
    response.statusCode = code;
    return response;
  });
  response.json = jest.fn((data: unknown) => {
    response.payload = data;
    return response;
  });

  return response;
};

describe('/api/blog', () => {
  afterEach(() => {
    mockedGetFeaturedArticles.mockReset();
    mockedListArticles.mockReset();
  });

  it('returns matched excerpts from repository search results', async () => {
    const post = {
      id: 'article-1',
      slug: 'article-1',
      title: 'Article',
      summary: 'Original summary',
      matchedExcerpt: '...body keyword context...',
      cover: null,
      publishedAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
      tags: [],
      featured: false,
      draft: false,
      readingTimeMinutes: 1,
      sourceNodeToken: 'node-1',
      sourceDocumentId: 'doc-1',
    };

    mockedListArticles.mockResolvedValue({
      page: 1,
      perPage: 6,
      totalPages: 1,
      totalPosts: 1,
      posts: [post],
    });
    mockedGetFeaturedArticles.mockResolvedValue([]);

    const req = {
      query: { page: '1', per_page: '6', search: 'keyword' },
    } as unknown as NextApiRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedListArticles).toHaveBeenCalledWith({
      page: 1,
      perPage: 6,
      search: 'keyword',
      tag: undefined,
      featured: undefined,
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      status: true,
      data: {
        posts: [
          expect.objectContaining({ matchedExcerpt: post.matchedExcerpt }),
        ],
      },
    });
  });
});
