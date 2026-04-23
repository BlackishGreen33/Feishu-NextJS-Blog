import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import cn from '@/common/libs/cn';

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

const getColumnLayoutClassName = (className?: string) => {
  if (!className) return null;
  if (className.includes('columns-3')) {
    return 'my-6 grid gap-6 md:grid-cols-3';
  }
  if (className.includes('columns-2')) {
    return 'my-6 grid gap-6 md:grid-cols-2';
  }
  return null;
};

const isColumnItem = (className?: string) =>
  Boolean(
    className &&
    (className.includes('w-[33%]') ||
      className.includes('w-[50%]') ||
      className.includes('width-ratio')),
  );

const toCodeValue = (children?: ReactNode) =>
  Array.isArray(children) ? children.join('') : String(children ?? '');

const MDXComponent = ({
  children,
  allowRawHtml = true,
}: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={allowRawHtml ? [rehypeRaw] : []}
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
        div: ({ className, ...props }) => {
          const columnLayoutClassName = getColumnLayoutClassName(className);

          if (columnLayoutClassName) {
            return <div className={columnLayoutClassName} {...props} />;
          }

          if (isColumnItem(className)) {
            return <div className='min-w-0 space-y-3' {...props} />;
          }

          return <div className={className} {...props} />;
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
        img: (props) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...props}
            alt={props.alt || ''}
            className='my-4 rounded-2xl border border-neutral-200 dark:border-neutral-700'
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default MDXComponent;
