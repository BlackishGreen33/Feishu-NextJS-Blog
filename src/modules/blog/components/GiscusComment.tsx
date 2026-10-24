import { useTheme } from 'next-themes';
import Giscus from '@giscus/react';

import {
  SITE_GISCUS_CATEGORY,
  SITE_GISCUS_CATEGORY_ID,
  SITE_GISCUS_REPO,
  SITE_GISCUS_REPO_ID,
} from '@/common/config/site';
import { useI18n } from '@/i18n';

interface GiscusComment {
  isEnableReaction?: boolean;
  discussionTerm?: string;
}

const GiscusComment = ({
  isEnableReaction = false,
  discussionTerm,
}: GiscusComment) => {
  const { resolvedTheme } = useTheme();
  const { locale } = useI18n();

  if (
    !SITE_GISCUS_REPO ||
    !SITE_GISCUS_REPO_ID ||
    !SITE_GISCUS_CATEGORY ||
    !SITE_GISCUS_CATEGORY_ID
  ) {
    return null;
  }

  return (
    <div className='mt-5 mb-2'>
      <Giscus
        key={discussionTerm}
        repo={SITE_GISCUS_REPO}
        repoId={SITE_GISCUS_REPO_ID}
        category={SITE_GISCUS_CATEGORY}
        categoryId={SITE_GISCUS_CATEGORY_ID}
        mapping={discussionTerm ? 'specific' : 'pathname'}
        {...(discussionTerm ? { term: discussionTerm } : {})}
        strict={discussionTerm ? '1' : '0'}
        reactionsEnabled={isEnableReaction ? '1' : '0'}
        emitMetadata='1'
        inputPosition='top'
        theme={resolvedTheme === 'dark' ? 'transparent_dark' : 'light'}
        lang={locale}
        loading='lazy'
      />
    </div>
  );
};

export default GiscusComment;
