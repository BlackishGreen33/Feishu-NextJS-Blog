import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { SWRConfig } from 'swr';

import type { SubContentMetaProps } from '@/common/types/learn';
import ContentDetail from '@/modules/learn/components/ContentDetail';

jest.mock('axios');
const push = jest.fn();
let asPath = '/learn/js/a';
jest.mock('next/router', () => ({
  useRouter: () => ({ asPath, push, locale: 'en' }),
}));
jest.mock('@/modules/learn/components/ContentBody', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <p>{content}</p>,
}));
jest.mock('@/modules/learn/components/ContentPlayground', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/modules/blog/components/GiscusComment', () => ({
  __esModule: true,
  default: () => null,
}));

it('derives adjacent titles from validated content and updates them after navigation', async () => {
  const rows = ['a', 'b', 'c'].map((slug, id) => ({
    id,
    slug,
    title: `Lesson ${slug}`,
    parent_slug: 'js',
  }));
  jest.mocked(axios.get).mockResolvedValue({ data: { data: rows } });
  window.scrollTo = jest.fn();
  const meta: SubContentMetaProps = {
    id: 0,
    title: 'A',
    category: 'js',
    created_at: '',
    updated_at: '',
    is_playground: false,
    is_comment: false,
  };
  const view = () => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ContentDetail content='Lesson body' frontMatter={meta} />
    </SWRConfig>
  );
  const { rerender } = render(view());
  expect(screen.getByText('Lesson body')).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Lesson b/ }),
    ).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: /Lesson b/ }));
  expect(push).toHaveBeenCalledWith('/learn/js/b');
  asPath = '/learn/js/b';
  rerender(view());
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Lesson a/ }),
    ).toBeInTheDocument(),
  );
  expect(screen.getByRole('button', { name: /Lesson c/ })).toBeInTheDocument();
  asPath = '/learn/js/a';
});
