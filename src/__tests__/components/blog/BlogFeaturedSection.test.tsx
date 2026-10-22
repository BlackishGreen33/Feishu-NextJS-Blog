import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { SWRConfig } from 'swr';

import BlogFeaturedSection from '@/modules/blog/components/BlogFeaturedSection';

import seed from '../../../../data/feishu-blog/index.json';

jest.mock('axios');
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

it('reads a validated response and displays the featured Article', async () => {
  const article = seed.articles[0];
  if (!article) throw new Error('The seed must contain an Article');
  jest.mocked(axios.get).mockResolvedValue({
    data: {
      status: true,
      data: {
        posts: [article],
        total_pages: 1,
        total_posts: 1,
        page: 1,
        per_page: 4,
        featured_posts: [article],
      },
    },
  });
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <BlogFeaturedSection />
    </SWRConfig>,
  );
  expect(
    await screen.findByRole('heading', { name: article.title }),
  ).toBeInTheDocument();
});
