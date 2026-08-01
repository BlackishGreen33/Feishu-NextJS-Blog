import { useRouter } from 'next/router';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import BlogListNew from '@/modules/blog/components/BlogListNew';
import { fetcher } from '@/services/fetcher';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/fetcher', () => ({
  fetcher: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedFetcher = jest.mocked(fetcher);

describe('BlogListNew', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({
      locale: 'en',
      query: { tag: 'react' },
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    mockedFetcher.mockResolvedValue({
      status: true,
      data: {
        posts: [],
        total_pages: 1,
        total_posts: 0,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters the article list from the tag query', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BlogListNew />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(mockedFetcher).toHaveBeenCalledWith(
        '/api/blog?page=1&per_page=6&tag=react',
      ),
    );
    expect(mockedFetcher).not.toHaveBeenCalledWith(
      '/api/blog?page=1&per_page=4&featured=true',
    );
    expect(screen.getByText('#react')).toBeInTheDocument();
  });
});
