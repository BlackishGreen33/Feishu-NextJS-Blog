import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import BlogDetail from '@/modules/blog/components/BlogDetail';

jest.mock('@/common/components/elements/MDXComponent', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => (
    <div>
      <h2 id='article-section-first' data-toc-label='第一節'>
        第一節
      </h2>
      {children}
      <h3 id='article-section-next' data-toc-label='下一節'>
        下一節
      </h3>
    </div>
  ),
}));

jest.mock('@giscus/react', () => ({ __esModule: true, default: () => null }));

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'zh-TW' }),
}));

let mockSecondTop = 500;
let mockNotify = () => {};
const mockDisconnect = jest.fn();

beforeEach(() => {
  // JSDOM lacks native SVG geometry; real path/plane rendering is checked in Chromium.
  Object.defineProperties(SVGElement.prototype, {
    getTotalLength: { configurable: true, value: () => 100 },
    getPointAtLength: {
      configurable: true,
      value: (length: number) => ({ x: 5, y: length }),
    },
  });
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
    })),
  });
  mockSecondTop = 500;
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: jest.fn().mockImplementation((notify: () => void) => {
      mockNotify = notify;
      return { observe: jest.fn(), disconnect: mockDisconnect };
    }),
  });
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      return new DOMRect(
        0,
        this.id === 'article-section-next' ? mockSecondTop : 0,
        100,
        30,
      );
    });
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('BlogDetail', () => {
  it('links tags and tracks headings even when scrolling skips observer intersections', async () => {
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

    await act(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    });
    expect(
      screen.getAllByRole('navigation', { name: '文章目錄' }),
    ).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '下一節' })[0]).toHaveAttribute(
      'href',
      '#article-section-next',
    );
    expect(screen.getAllByRole('link', { name: '第一節' })[0]).toHaveAttribute(
      'aria-current',
      'location',
    );
    mockSecondTop = 80;
    act(() => mockNotify());
    expect(screen.getAllByRole('link', { name: '下一節' })[0]).toHaveAttribute(
      'aria-current',
      'location',
    );
    mockSecondTop = 500;
    act(() => mockNotify());
    mockSecondTop = 0;
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen.getAllByRole('link', { name: '下一節' })[0],
      ).toHaveAttribute('aria-current', 'location'),
    );
    expect(
      screen
        .getByLabelText('章節目錄', { selector: 'summary' })
        .closest('details'),
    ).not.toHaveAttribute('open');
    expect(screen.queryByText('章節目錄')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#React' })).toHaveAttribute(
      'href',
      '/blog?tag=react',
    );
  });
});
