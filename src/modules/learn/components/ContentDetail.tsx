import { useRouter } from 'next/router';
import useSWR from 'swr';

import NavigationSection from '@/common/components/elements/NavigationSection';
import { parseUrl } from '@/common/helpers';
import { contentListSchema } from '@/common/schemas/learn';
import { SubContentMetaProps } from '@/common/types/learn';
import GiscusComment from '@/modules/blog/components/GiscusComment';
import { fetchValidated } from '@/services/fetcher';

import ContentBody from './ContentBody';
import ContentPlayground from './ContentPlayground';

interface ContentDetailProps {
  content: string;
  frontMatter: SubContentMetaProps;
}

const ContentDetail = ({ content, frontMatter }: ContentDetailProps) => {
  const router = useRouter();
  const currentUrl = router.asPath;
  const { parentSlug, contentSlug } = parseUrl(currentUrl);

  const meta = frontMatter;
  const isShowPlayground = meta?.is_playground ?? false;
  const isShowComment = meta?.is_comment ?? false;
  const initialCode = meta?.initial_code ?? '';

  const { data: resContentData } = useSWR(
    `/api/content?category=${parentSlug}`,
    (url: string) => fetchValidated(url, contentListSchema.parse),
  );

  const contentList = resContentData?.data ?? [];
  const currentId =
    contentList.find((item) => item.slug === contentSlug)?.id ?? 0;
  const previousContent =
    currentId > 0
      ? contentList.find((item) => item.id === currentId - 1)
      : undefined;
  const nextContent =
    currentId < contentList.length - 1
      ? contentList.find((item) => item.id === currentId + 1)
      : undefined;

  const handleNavigation = (step: number) => {
    const targetContent = contentList.find(
      (item) => item.id === currentId + step,
    );

    if (targetContent) {
      const { slug: targetSlug } = targetContent;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      void router.push(`/learn/${parentSlug}/${targetSlug}`);
    }
  };

  return (
    <>
      {content && <ContentBody content={content} />}
      <NavigationSection
        currentIndex={currentId}
        totalItems={contentList.length}
        handleNext={() => handleNavigation(1)}
        handlePrevious={() => handleNavigation(-1)}
        previousTitle={previousContent?.title ?? null}
        nextTitle={nextContent?.title ?? null}
      />
      {isShowPlayground && <ContentPlayground initialCode={initialCode} />}
      {isShowComment && (
        <section
          id='comments'
          className='my-10 border-t border-gray-300 dark:border-neutral-700'
        >
          <GiscusComment />
        </section>
      )}
    </>
  );
};

export default ContentDetail;
