import type { ImageProps } from 'next/image';
import { render, screen } from '@testing-library/react';

import BlogCardNew from '@/modules/blog/components/BlogCardNew';

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'en' }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className, width, height }: ImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' ? src : 'mock-image'}
      alt={alt || ''}
      className={className}
      width={width}
      height={height}
    />
  ),
}));

describe('BlogCardNew', () => {
  it('prefers matched excerpt over the original summary', () => {
    render(
      <BlogCardNew
        id='article-1'
        slug='article-1'
        title='Searchable Article'
        summary='Original summary'
        matchedExcerpt='...matched body excerpt...'
        cover={null}
        publishedAt='2026-04-23T00:00:00.000Z'
        updatedAt='2026-04-23T00:00:00.000Z'
        tags={[]}
        featured={false}
        draft={false}
        readingTimeMinutes={2}
        sourceNodeToken='node-1'
        sourceDocumentId='doc-1'
      />,
    );

    expect(screen.getByText('...matched body excerpt...')).toBeInTheDocument();
    expect(screen.queryByText('Original summary')).not.toBeInTheDocument();
  });
});
