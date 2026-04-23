import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import type { ReactElement, ReactNode } from 'react';

import { feishuHtmlSanitizeSchema } from '@/common/libs/htmlSanitizer';

const reactMarkdownMock = jest.fn();

jest.mock('@/common/components/elements/CodeBlock', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => (
    <code data-testid='code-block'>{children}</code>
  ),
}));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: (props: unknown) => {
    reactMarkdownMock(props);
    return <div data-testid='markdown-root' />;
  },
}));
jest.mock('rehype-raw', () => ({
  __esModule: true,
  default: 'rehype-raw',
}));
jest.mock('rehype-sanitize', () => ({
  __esModule: true,
  default: 'rehype-sanitize',
}));
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: 'remark-gfm',
}));

import MDXComponent from '@/common/components/elements/MDXComponent';

type MarkdownComponents = {
  div: (props: Record<string, unknown>) => ReactElement;
  img: (props: Record<string, unknown>) => ReactElement;
};

const loadArticleContent = (fileName: string) => {
  const filePath = path.join(
    process.cwd(),
    'data',
    'feishu-blog',
    'articles',
    fileName,
  );

  return JSON.parse(fs.readFileSync(filePath, 'utf8')).content as string;
};

const getMarkdownComponents = () => {
  const markdownProps = reactMarkdownMock.mock.calls[0][0] as {
    components: MarkdownComponents;
  };

  return markdownProps.components;
};

describe('MDXComponent', () => {
  beforeEach(() => {
    reactMarkdownMock.mockClear();
  });

  it('wires raw HTML parsing through sanitize when enabled', () => {
    render(
      <MDXComponent>{loadArticleContent('会议记录-简洁版.json')}</MDXComponent>,
    );

    expect(reactMarkdownMock).toHaveBeenCalledTimes(1);
    expect(reactMarkdownMock.mock.calls[0][0]).toMatchObject({
      rehypePlugins: [
        'rehype-raw',
        ['rehype-sanitize', feishuHtmlSanitizeSchema],
      ],
    });
  });

  it('omits rehypeRaw when raw HTML parsing is disabled', () => {
    render(
      <MDXComponent allowRawHtml={false}>
        {loadArticleContent('会议记录-简洁版.json')}
      </MDXComponent>,
    );

    expect(reactMarkdownMock.mock.calls[0][0]).toMatchObject({
      rehypePlugins: [['rehype-sanitize', feishuHtmlSanitizeSchema]],
    });
  });

  it('maps Feishu column and image nodes into safe layout props', () => {
    render(
      <MDXComponent>
        {loadArticleContent('10-個-css-小技巧.json')}
      </MDXComponent>,
    );

    const components = getMarkdownComponents();
    const columnLayoutNode = {
      type: 'element',
      tagName: 'div',
      properties: {
        'column-size': '2',
      },
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'width-ratio': '38',
          },
          children: [],
        },
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'width-ratio': '61',
          },
          children: [],
        },
      ],
    };
    const columnItemNode = {
      type: 'element',
      tagName: 'div',
      properties: {
        'width-ratio': '38',
      },
      children: [],
    };

    const { container } = render(
      <div>
        {components.div({
          node: columnLayoutNode,
          children: 'layout',
        })}
        {components.div({
          node: columnItemNode,
          children: 'column item',
        })}
        {components.img({
          node: {
            type: 'element',
            tagName: 'img',
            properties: {
              align: 'center',
            },
            children: [],
          },
          alt: 'preview',
          src: '/feishu-assets/image/preview.png',
        })}
      </div>,
    );

    expect(
      Array.from(container.querySelectorAll('div[style]')).some((element) =>
        element.getAttribute('style')?.includes('--feishu-columns: 38fr 61fr'),
      ),
    ).toBe(true);
    expect(screen.getByText('column item')).toHaveClass('min-w-0', 'space-y-3');
    expect(screen.getByRole('img', { name: 'preview' })).toHaveClass('mx-auto');
  });

  it('passes through supported callout classes only', () => {
    render(
      <MDXComponent>{loadArticleContent('会议记录-简洁版.json')}</MDXComponent>,
    );

    const components = getMarkdownComponents();

    render(
      components.div({
        className: 'callout callout-bg-2 callout-border-2',
        node: {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['callout', 'callout-bg-2', 'callout-border-2'],
          },
          children: [],
        },
        children: 'safe',
      }),
    );

    expect(screen.getByText('safe')).toBeInTheDocument();
    expect(screen.getByText('safe').closest('div')).toHaveClass(
      'callout',
      'callout-bg-2',
      'callout-border-2',
    );
  });
});
