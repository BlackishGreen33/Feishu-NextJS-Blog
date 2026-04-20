import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';

import BackButton from '@/common/components/elements/BackButton';
import Container from '@/common/components/elements/Container';
import Loading from '@/common/components/elements/Loading';
import PageHeading from '@/common/components/elements/PageHeading';
import { getCanonicalUrl } from '@/common/config/seo';
import { useSiteConfig } from '@/common/config/site';
import { LEARN_CONTENTS } from '@/common/constant/learn';
import { loadMdxFiles } from '@/common/libs/mdx';
import { ContentProps, MdxFileContentProps } from '@/common/types/learn';
import { useI18n } from '@/i18n';
import ContentList from '@/modules/learn/components/ContentList';

interface ContentPageProps {
  content: ContentProps | null;
  subContents: MdxFileContentProps[];
}

const LearnContentPage: NextPage<ContentPageProps> = ({
  content,
  subContents,
}) => {
  const router = useRouter();
  const { locale, messages } = useI18n();
  const site = useSiteConfig();

  if (router.isFallback) {
    return <Loading />;
  }

  if (!content) {
    return null;
  }

  const { title, description } = content;

  const sortedSubContents = subContents.sort(
    (a, b) => a.frontMatter.id - b.frontMatter.id,
  );

  const canonicalUrl = getCanonicalUrl(`/learn/${content?.slug}`, locale);

  return (
    <>
      <NextSeo
        title={`${messages.pages.learnTitle} ${title} - ${site.name}`}
        description={description}
        canonical={canonicalUrl}
        openGraph={{
          url: canonicalUrl,
          images: [
            {
              url: content?.image,
            },
          ],
          siteName: site.name,
        }}
      />
      <Container data-aos='fade-up'>
        <BackButton url='/learn' />
        <PageHeading title={title} description={description} />
        <ContentList
          sortedSubContents={sortedSubContents}
          content={content}
          title={title}
        />
      </Container>
    </>
  );
};

export default LearnContentPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = LEARN_CONTENTS.map((content) => ({
    params: { content: content.slug },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const contentSlug = params?.content as string;

  const content =
    LEARN_CONTENTS.find((item) => item?.slug === contentSlug) || null;

  if (!content) {
    return {
      redirect: {
        destination: '/404',
        permanent: false,
      },
    };
  }

  const subContentList = loadMdxFiles(content?.slug);

  return {
    props: {
      content,
      subContents: subContentList,
    },
  };
};
