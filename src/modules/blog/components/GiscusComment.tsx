import { useTheme } from 'next-themes';
import Giscus from '@giscus/react';

import {
  SITE_GISCUS_CATEGORY,
  SITE_GISCUS_CATEGORY_ID,
  SITE_GISCUS_REPO,
  SITE_GISCUS_REPO_ID,
} from '@/common/config/site';

interface GiscusComment {
  isEnableReaction?: boolean;
}

const GiscusComment = ({ isEnableReaction = false }: GiscusComment) => {
  const { theme } = useTheme();

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
        repo={SITE_GISCUS_REPO}
        repoId={SITE_GISCUS_REPO_ID}
        category={SITE_GISCUS_CATEGORY}
        categoryId={SITE_GISCUS_CATEGORY_ID}
        mapping='pathname'
        reactionsEnabled={isEnableReaction ? '1' : '0'}
        emitMetadata='1'
        inputPosition='top'
        theme={theme === 'dark' ? 'transparent_dark' : 'light'}
        lang='en'
        loading='lazy'
      />
    </div>
  );
};

export default GiscusComment;
