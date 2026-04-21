import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import {
  HiCheckCircle as CheckIcon,
  HiOutlineClipboardCopy as CopyIcon,
} from 'react-icons/hi';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import css from 'react-syntax-highlighter/dist/cjs/languages/prism/css';
import diff from 'react-syntax-highlighter/dist/cjs/languages/prism/diff';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import tsx from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import { a11yDark as themeColor } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useCopyToClipboard } from 'usehooks-ts';

const languages = {
  javascript: 'javascript',
  typescript: 'typescript',
  diff: 'diff',
  tsx: 'tsx',
  css: 'css',
};

SyntaxHighlighter.registerLanguage(languages.javascript, javascript);
SyntaxHighlighter.registerLanguage(languages.typescript, typescript);
SyntaxHighlighter.registerLanguage(languages.diff, diff);
SyntaxHighlighter.registerLanguage(languages.tsx, tsx);
SyntaxHighlighter.registerLanguage(languages.css, css);

interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  className?: string;
  isBlock?: boolean;
  node?: unknown;
}

export const CodeBlockBase = ({
  className = '',
  children,
  isBlock = false,
  ...props
}: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [, copy] = useCopyToClipboard();
  const match = /language-(\w+)/.exec(className || '');
  const code = Array.isArray(children)
    ? children.join('')
    : String(children ?? '');

  const handleCopy = (code: string) => {
    copy(code);
    setIsCopied(true);
  };

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  return (
    <>
      {isBlock ? (
        <div className='relative'>
          <button
            className='absolute top-3 right-3 rounded-lg border border-neutral-700 p-2 hover:bg-neutral-800'
            type='button'
            aria-label='Copy to Clipboard'
            onClick={() => handleCopy(code)}
            data-umami-event='Click Copy Code'
          >
            {!isCopied ? (
              <CopyIcon size={18} className='text-neutral-400' />
            ) : (
              <CheckIcon size={18} className='text-green-600' />
            )}
          </button>

          <SyntaxHighlighter
            {...props}
            style={themeColor}
            customStyle={{
              padding: '20px',
              fontSize: '14px',
              borderRadius: '8px',
              paddingRight: '50px',
            }}
            PreTag='div'
            language={match?.[1]}
            wrapLongLines={true}
          >
            {code.replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code
          className='rounded-md bg-neutral-200 px-2 py-1 text-[14px] font-light text-sky-600 dark:bg-neutral-700 dark:text-sky-300'
          {...props}
        >
          {children}
        </code>
      )}
    </>
  );
};

const LoadingPlaceholder = () => (
  <span
    aria-hidden='true'
    className='inline-block min-h-[1.5rem] min-w-[3ch] align-baseline'
  />
);

export default dynamic(() => Promise.resolve(CodeBlockBase), {
  ssr: false,
  loading: LoadingPlaceholder,
});
