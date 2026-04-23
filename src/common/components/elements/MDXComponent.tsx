import { CSSProperties, ReactNode } from 'react';
import type { Element } from 'hast';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import cn from '@/common/libs/cn';
import { feishuHtmlSanitizeSchema } from '@/common/libs/htmlSanitizer';

import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  children: string;
  allowRawHtml?: boolean;
}

interface TableProps {
  children?: ReactNode;
}

const Table = ({ children }: TableProps) => (
  <div className='table-container'>
    <table className='table w-full'>{children}</table>
  </div>
);

const toAttributeString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return undefined;
};

const getNodeAttribute = (node: Element | undefined, name: string) =>
  toAttributeString(node?.properties?.[name]);

const getColumnCount = (node: Element | undefined) => {
  const value = Number(getNodeAttribute(node, 'column-size'));
  return Number.isFinite(value) && value > 1 ? value : null;
};

const getColumnTemplate = (node: Element | undefined, columnCount: number) => {
  const divChildren = node?.children.filter(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'div',
  );

  if (!divChildren || divChildren.length < columnCount) {
    return null;
  }

  const ratios = divChildren.slice(0, columnCount).map((child) => {
    const ratio = Number(getNodeAttribute(child, 'width-ratio'));
    return Number.isFinite(ratio) && ratio > 0 ? `${ratio}fr` : null;
  });

  return ratios.every(Boolean) ? ratios.join(' ') : null;
};

const getColumnLayoutProps = (node: Element | undefined) => {
  const columnCount = getColumnCount(node);

  if (!columnCount) return null;

  const columnTemplate = getColumnTemplate(node, columnCount);

  if (columnTemplate) {
    return {
      className:
        'my-6 grid gap-6 md:[grid-template-columns:var(--feishu-columns)]',
      style: {
        '--feishu-columns': columnTemplate,
      } as CSSProperties,
    };
  }

  if (columnCount === 3) {
    return {
      className: 'my-6 grid gap-6 md:grid-cols-3',
      style: undefined,
    };
  }

  if (columnCount === 2) {
    return {
      className: 'my-6 grid gap-6 md:grid-cols-2',
      style: undefined,
    };
  }

  return null;
};

const isColumnItem = (node: Element | undefined) =>
  Boolean(getNodeAttribute(node, 'width-ratio'));

const toCodeValue = (children?: ReactNode) =>
  Array.isArray(children) ? children.join('') : String(children ?? '');

const getImageAlignmentClassName = (align?: string) => {
  if (align === 'center') return 'block mx-auto';
  if (align === 'right') return 'block ml-auto';
  if (align === 'left') return 'block mr-auto';
  return null;
};

const MDXComponent = ({
  children,
  allowRawHtml = true,
}: MarkdownRendererProps) => {
  const rehypePlugins = allowRawHtml
    ? [rehypeRaw, [rehypeSanitize, feishuHtmlSanitizeSchema] as const]
    : [[rehypeSanitize, feishuHtmlSanitizeSchema] as const];

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={{
        h1: (props) => (
          <h1
            className='pb-2 text-2xl font-semibold text-neutral-100 first:pt-0 dark:text-neutral-100'
            {...props}
          />
        ),
        a: (props) => (
          <a
            className='cursor-pointer text-teal-500 hover:text-teal-400 hover:underline'
            {...props}
          />
        ),
        p: (props) => (
          <p
            className='mb-4 leading-8 text-neutral-700 last:mb-0 dark:text-neutral-300'
            {...props}
          />
        ),
        div: ({ className, node, ...props }) => {
          const columnLayout = getColumnLayoutProps(
            node as Element | undefined,
          );
          const domProps = {
            ...props,
          } as typeof props & Record<string, unknown>;

          delete domProps['column-size'];
          delete domProps['width-ratio'];

          if (columnLayout) {
            return (
              <div
                className={columnLayout.className}
                style={columnLayout.style}
                {...(domProps as typeof props)}
              />
            );
          }

          if (isColumnItem(node as Element | undefined)) {
            return (
              <div
                className='min-w-0 space-y-3'
                {...(domProps as typeof props)}
              />
            );
          }

          return <div className={className} {...(domProps as typeof props)} />;
        },
        h2: (props) => (
          <h2
            className='pt-6 text-xl font-medium first:pt-0 dark:text-neutral-300'
            {...props}
          />
        ),
        h3: (props) => (
          <h3
            className='pt-4 text-[18px] leading-snug font-medium first:pt-0 dark:text-neutral-300'
            {...props}
          />
        ),
        h4: (props) => (
          <h4
            className='pt-3 text-base font-medium text-neutral-100 first:pt-0 dark:text-neutral-200'
            {...props}
          />
        ),
        h5: (props) => (
          <h5
            className='text-base font-semibold text-neutral-100 dark:text-neutral-200'
            {...props}
          />
        ),
        strong: (props) => (
          <strong className='font-semibold text-neutral-100' {...props} />
        ),
        ul: ({ node: _node, ...props }) => (
          <ul className='list-disc space-y-3 pb-2 pl-10 last:pb-0' {...props} />
        ),
        ol: ({ node: _node, ...props }) => (
          <ol
            className='list-decimal space-y-3 pb-2 pl-10 last:pb-0'
            {...props}
          />
        ),
        li: ({ node: _node, ...props }) => (
          <li
            className='leading-8 text-neutral-700 dark:text-neutral-300'
            {...props}
          />
        ),
        code: ({ children, className, node: _node, ...props }) => (
          <CodeBlock
            {...props}
            className={className}
            isBlock={Boolean(className) || toCodeValue(children).includes('\n')}
          >
            {children}
          </CodeBlock>
        ),
        blockquote: (props) => (
          <blockquote
            className='rounded-br-2xl border-l-[5px] border-neutral-700 border-l-cyan-500 bg-neutral-200 py-3 pl-6 text-lg font-medium text-cyan-800 dark:bg-neutral-800 dark:text-cyan-200'
            {...props}
          />
        ),
        input: ({ className, ...props }) => {
          if (props.type === 'checkbox') {
            return (
              <input
                {...props}
                readOnly
                className={cn(
                  'mr-2 inline-block h-4 w-4 align-middle accent-cyan-500',
                  className,
                )}
              />
            );
          }

          return <input className={className} {...props} />;
        },
        hr: () => (
          <hr className='my-8 border-dashed border-neutral-300 dark:border-neutral-700' />
        ),
        table: (props) => <Table {...props} />,
        th: (props) => (
          <th className='border px-3 py-1 text-left dark:border-neutral-600'>
            {props.children}
          </th>
        ),
        td: (props) => (
          <td className='border px-3 py-1 dark:border-neutral-600'>
            {props.children}
          </td>
        ),
        img: ({ className, node, ...props }) => {
          const domProps = {
            ...props,
          } as typeof props & Record<string, unknown>;

          delete domProps['src-width'];
          delete domProps['src-height'];

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...(domProps as typeof props)}
              alt={props.alt || ''}
              className={cn(
                'my-4 rounded-2xl border border-neutral-200 dark:border-neutral-700',
                getImageAlignmentClassName(
                  getNodeAttribute(node as Element | undefined, 'align'),
                ),
                className,
              )}
            />
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default MDXComponent;
