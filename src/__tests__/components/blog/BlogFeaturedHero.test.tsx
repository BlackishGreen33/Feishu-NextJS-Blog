import { fireEvent, render, screen } from '@testing-library/react';

import { articleSummarySchema } from '@/common/schemas/blog';
import BlogFeaturedHero from '@/modules/blog/components/BlogFeaturedHero';

import seed from '../../../../data/feishu-blog/index.json';

jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

it('keeps a valid selected article when the featured collection shrinks', () => {
  const first = {
    ...articleSummarySchema.parse(seed.articles[0]),
    title: 'First',
  };
  const second = { ...first, id: 'second', title: 'Second', slug: 'second' };
  const { rerender } = render(<BlogFeaturedHero data={[first, second]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Second' }));
  expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  rerender(<BlogFeaturedHero data={[first]} />);
  expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
  rerender(<BlogFeaturedHero data={[]} />);
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});
