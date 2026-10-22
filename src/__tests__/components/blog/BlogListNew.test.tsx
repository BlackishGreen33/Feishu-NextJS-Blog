import { useRouter } from 'next/router';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import BlogListNew from '@/modules/blog/components/BlogListNew';
import { fetchValidated } from '@/services/fetcher';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/fetcher', () => ({
  fetchValidated: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedFetcher = jest.mocked(fetchValidated);

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
      expect(mockedFetcher.mock.calls.map((call) => call[0])).toContain(
        '/api/blog?page=1&per_page=6&tag=react',
      ),
    );
    expect(mockedFetcher.mock.calls.map((call) => call[0])).not.toContain(
      '/api/blog?page=1&per_page=4&featured=true',
    );
    expect(screen.getByText('#react')).toBeInTheDocument();
  });

  it('follows page and tag changes from the external router state', async () => {
    mockedUseRouter.mockReturnValue({
      locale: 'en',
      query: { page: '3', tag: 'react' },
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    const { rerender } = render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BlogListNew />
      </SWRConfig>,
    );
    await waitFor(() =>
      expect(mockedFetcher.mock.calls.map((call) => call[0])).toContain(
        '/api/blog?page=3&per_page=6&tag=react',
      ),
    );
    mockedUseRouter.mockReturnValue({
      locale: 'en',
      query: { page: '2', tag: 'next' },
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    rerender(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <BlogListNew />
      </SWRConfig>,
    );
    await waitFor(() =>
      expect(mockedFetcher.mock.calls.map((call) => call[0])).toContain(
        '/api/blog?page=2&per_page=6&tag=next',
      ),
    );
    expect(screen.getByText('#next')).toBeInTheDocument();
  });
});
