import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';

import BackButton from '@/common/components/elements/BackButton';
import Container from '@/common/components/elements/Container';
import { useSiteConfig } from '@/common/config/site';
import { LEARN_CONTENTS } from '@/common/constant/learn';
import { parseUrl } from '@/common/helpers';
import { loadMdxFiles } from '@/common/libs/mdx';
import { MdxFileContentProps } from '@/common/types/learn';
import { useI18n } from '@/i18n';
import ContentDetail from '@/modules/learn/components/ContentDetail';
import ContentDetailHeader from '@/modules/learn/components/ContentDetailHeader';

const LearnContentDetailPage: NextPage<{ data: MdxFileContentProps }> = ({
  data,
}) => {
  const { content, frontMatter } = data;
  const { locale, messages } = useI18n();
  const site = useSiteConfig();

  const router = useRouter();
  const currentUrl = router.asPath;
  const { parentSlug } = parseUrl(currentUrl);

  const meta = frontMatter;

  const PAGE_TITLE = meta?.title;
  const PAGE_DESCRIPTION =
    locale === 'en'
      ? `${messages.pages.learnTitle} ${meta?.category} - ${PAGE_TITLE} with detailed explanations`
      : `${messages.pages.learnTitle} ${meta?.category} - ${PAGE_TITLE}`;

  return (
    <>
      <NextSeo
        title={`${messages.pages.learnTitle} ${meta?.category} : ${PAGE_TITLE} - ${site.name}`}
        description={PAGE_DESCRIPTION}
        openGraph={{
          type: 'article',
          article: {
            publishedTime: meta?.updated_at,
            modifiedTime: meta?.updated_at,
            authors: [site.name],
          },
          images: [
            {
              url: meta?.cover_url as string,
            },
          ],
          siteName: site.name,
        }}
      />
      <Container data-aos='fade-up' className='mb-10'>
        <BackButton url={`/learn/${parentSlug}`} />
        <ContentDetailHeader {...meta} />
        <ContentDetail content={content} frontMatter={frontMatter} />
      </Container>
    </>
  );
};

export default LearnContentDetailPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = LEARN_CONTENTS.flatMap((content) =>
    loadMdxFiles(content.slug).map((item) => ({
      params: {
        content: content.slug,
        slug: item.slug,
      },
    })),
  );

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const parentContent = params?.content as string;
  const slug = params?.slug as string;

  const parentExists = LEARN_CONTENTS.some(
    (item) => item.slug === parentContent,
  );

  if (!parentExists) {
    return {
      redirect: {
        destination: '/404',
        permanent: false,
      },
    };
  }

  const contentList = await loadMdxFiles(parentContent);

  const contentData = contentList.find((item) => item.slug === slug);

  if (!contentData) {
    return {
      redirect: {
        destination: '/404',
        permanent: false,
      },
    };
  }

  return {
    props: {
      data: contentData,
    },
  };
};
