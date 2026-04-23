import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/comments';
import { sanitizeCommentList } from '@/server/blog/htmlSanitizer';
import { getBlogComment } from '@/services/devto';

jest.mock('@/services/devto', () => ({
  getBlogComment: jest.fn(),
}));
jest.mock('@/server/blog/htmlSanitizer', () => ({
  sanitizeCommentList: jest.fn(),
}));

const mockedGetBlogComment = jest.mocked(getBlogComment);
const mockedSanitizeCommentList = jest.mocked(sanitizeCommentList);

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

describe('/api/comments', () => {
  afterEach(() => {
    mockedGetBlogComment.mockReset();
    mockedSanitizeCommentList.mockReset();
  });

  it('sanitizes top-level and nested comment HTML before responding', async () => {
    const rawComments = [
      {
        body_html:
          '<p>top</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
        children: [
          {
            body_html:
              '<p><a href="https://example.com" onclick="alert(1)">child</a></p>',
            children: [],
          },
        ],
      },
    ];
    const sanitizedComments = [
      {
        body_html: '<p>top</p><a>bad</a>',
        children: [
          {
            body_html: '<p><a href="https://example.com">child</a></p>',
            children: [],
          },
        ],
      },
    ];

    mockedGetBlogComment.mockResolvedValue({
      status: 200,
      data: rawComments,
    });
    mockedSanitizeCommentList.mockResolvedValue(sanitizedComments);

    const req = {
      query: { post_id: '123' },
    } as unknown as NextApiRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedGetBlogComment).toHaveBeenCalledWith({ post_id: '123' });
    expect(mockedSanitizeCommentList).toHaveBeenCalledWith(rawComments);
    expect(res.headers['Cache-Control']).toBe(
      'public, s-maxage=60, stale-while-revalidate=30',
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      status: true,
      data: sanitizedComments,
    });
  });
});
