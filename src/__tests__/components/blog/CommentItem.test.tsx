import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt || ''} />
  ),
}));

import CommentItem from '@/modules/blog/components/CommentItem';

describe('CommentItem', () => {
  it('renders sanitized comment HTML without reintroducing stripped attributes', () => {
    const comment = {
      type_of: 'comment',
      id_code: 'comment_1',
      created_at: '2026-04-23T00:00:00.000Z',
      body_html:
        '<p>Hello <code>const answer = 42;</code> <a href="https://example.com">docs</a></p>',
      user: {
        name: 'Alice',
        username: 'alice',
        twitter_username: '',
        github_username: 'alice',
        user_id: 1,
        website_url: 'https://example.com',
        profile_image: 'https://example.com/avatar.png',
        profile_image_90: 'https://example.com/avatar.png',
      },
      children: [],
    };

    const { container } = render(<CommentItem {...comment} />);

    const link = screen.getByRole('link', { name: 'docs' });

    expect(screen.getByText('const answer = 42;')).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).not.toHaveAttribute('onclick');
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });
});
