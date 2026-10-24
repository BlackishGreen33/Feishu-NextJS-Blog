import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { useTheme } from 'next-themes';
import { motion, useReducedMotion } from 'framer-motion';
import {
  HiCheckCircle as CheckIcon,
  HiOutlineClipboardCopy as CopyIcon,
} from 'react-icons/hi';
import oneDark from 'react-syntax-highlighter/dist/cjs/styles/prism/one-dark';
import oneLight from 'react-syntax-highlighter/dist/cjs/styles/prism/one-light';
import { useCopyToClipboard } from 'usehooks-ts';

import useHasMounted from '@/common/hooks/useHasMounted';
import { parseCodeBackgrounds } from '@/common/libs/codeBackgrounds';
import { useI18n } from '@/i18n';

import { codeBackgroundRenderer } from './codeBackgroundRenderer';
import { getCodeLanguage, SyntaxHighlighter } from './codeLanguages';

interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  isBlock?: boolean;
  node?: unknown;
  backgroundMetadata?: unknown;
}

export const CodeBlockBase = ({
  className = '',
  children,
  isBlock = false,
  backgroundMetadata,
  ...props
}: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [, copy] = useCopyToClipboard();
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { messages } = useI18n();
  const { language, label } = getCodeLanguage(className);
  const code = Array.isArray(children)
    ? children.join('')
    : String(children ?? '');
  const backgrounds = parseCodeBackgrounds(backgroundMetadata, code.length);

  const handleCopy = async () => {
    try {
      if (await copy(code)) setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
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
        // Single-block frame adapted from Cult UI. See THIRD_PARTY_NOTICES.md.
        <div className='code-block group relative overflow-hidden rounded-2xl p-0.5'>
          <div className='code-toolbar float-right mt-2 mr-2 ml-3 flex h-8 items-center gap-2 text-xs'>
            <span>{label}</span>
            <motion.button
              className='code-copy inline-flex size-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2'
              type='button'
              data-copied={isCopied}
              {...(reduceMotion ? {} : { whileTap: { scale: 0.95 } })}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              aria-label={
                isCopied ? messages.common.codeCopied : messages.common.copyCode
              }
              onClick={() => {
                void handleCopy();
              }}
              data-umami-event='Click Copy Code'
            >
              {!isCopied ? <CopyIcon size={16} /> : <CheckIcon size={16} />}
            </motion.button>
            <span className='sr-only' role='status'>
              {isCopied ? messages.common.codeCopied : ''}
            </span>
          </div>

          <SyntaxHighlighter
            {...props}
            style={resolvedTheme === 'dark' ? oneDark : oneLight}
            customStyle={{
              padding: '16px 20px',
              fontSize: '14px',
              fontFamily: 'var(--firaCode-font)',
              background: 'transparent',
              overflow: 'visible',
              borderRadius: 'inherit',
              margin: 0,
            }}
            codeTagProps={{
              style: { background: 'transparent', overflowWrap: 'anywhere' },
            }}
            PreTag='div'
            language={language}
            wrapLongLines={true}
            {...(backgrounds.length
              ? { renderer: codeBackgroundRenderer(backgrounds) }
              : {})}
          >
            {backgrounds.length ? code : code.replace(/\n$/, '')}
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

const ClientCodeBlock = (props: CodeBlockProps) => {
  const hasMounted = useHasMounted();
  return hasMounted ? <CodeBlockBase {...props} /> : <LoadingPlaceholder />;
};

export default ClientCodeBlock;
