import { render, screen } from '@testing-library/react';

import BlogDetail from '@/modules/blog/components/BlogDetail';

jest.mock('@/common/components/elements/MDXComponent', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'zh-TW' }),
}));

describe('BlogDetail', () => {
  it('links each tag to the matching blog filter', () => {
    render(
      <BlogDetail
        id='article-1'
        slug='article-1'
        title='Article'
        summary='Summary'
        cover={null}
        publishedAt='2023-07-02T00:00:00.000Z'
        updatedAt='2023-07-02T00:00:00.000Z'
        tags={[{ name: 'React', slug: 'react' }]}
        featured={false}
        draft={false}
        readingTimeMinutes={2}
        sourceNodeToken='node-1'
        sourceDocumentId='doc-1'
        content='Body'
        contentFormat='markdown'
      />,
    );

    expect(screen.getByRole('link', { name: '#React' })).toHaveAttribute(
      'href',
      '/blog?tag=react',
    );
  });
});
