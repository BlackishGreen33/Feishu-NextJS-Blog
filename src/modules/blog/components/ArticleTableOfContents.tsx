import { useMemo } from 'react';
import { FiChevronDown, FiList } from 'react-icons/fi';

import { useI18n } from '@/i18n';

import RailToc from './RailToc';
import type { ArticleHeading } from './useArticleToc';

const ArticleTableOfContents = ({
  headings,
  activeId,
  mobile = false,
}: {
  headings: ArticleHeading[];
  activeId: string;
  mobile?: boolean;
}) => {
  const { messages } = useI18n();
  const items = useMemo(
    () =>
      headings.map(({ id, label, level }) => ({ id, label, depth: level - 1 })),
    [headings],
  );
  if (!headings.length) return null;
  const navigation = (
    <div className='max-h-[calc(100dvh-10rem)] overflow-y-auto p-2'>
      <RailToc
        items={items}
        activeId={activeId}
        title={messages.blog.tocLabel}
      />
    </div>
  );
  return mobile ? (
    <details className='group mb-4 min-[98rem]:hidden'>
      <summary
        aria-label={messages.blog.tocTitle}
        className='inline-flex min-h-11 list-none items-center gap-2 rounded-md px-2 focus-visible:outline-2'
      >
        <FiList size={18} aria-hidden />
        <FiChevronDown
          size={14}
          aria-hidden
          className='group-open:rotate-180'
        />
      </summary>
      {navigation}
    </details>
  ) : (
    <aside className='absolute inset-y-0 right-[calc(100%+2rem)] hidden w-48 min-[98rem]:block'>
      <div className='sticky top-28'>{navigation}</div>
    </aside>
  );
};

export default ArticleTableOfContents;
