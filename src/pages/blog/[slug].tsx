import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { NextSeo } from 'next-seo';

import BackButton from '@/common/components/elements/BackButton';
import Container from '@/common/components/elements/Container';
import { getCanonicalUrl } from '@/common/config/seo';
import {
  SITE_DEFAULT_BLOG_COVER,
  SITE_URL,
  useSiteConfig,
} from '@/common/config/site';
import { BlogDetailProps } from '@/common/types/blog';
import { useI18n } from '@/i18n';
import BlogDetail from '@/modules/blog/components/BlogDetail';
import { getAllArticleSlugs, getArticleBySlug } from '@/server/blog/repository';

interface BlogDetailPageProps {
  blog: BlogDetailProps;
}

const BlogDetailPage: NextPage<BlogDetailPageProps> = ({ blog }) => {
  const { locale } = useI18n();
  const site = useSiteConfig();
  const canonicalUrl = getCanonicalUrl(`/blog/${blog.slug}`, locale);

  return (
    <>
      <NextSeo
        title={`${blog.title} - ${site.name}`}
        description={blog.summary}
        canonical={canonicalUrl}
        openGraph={{
          type: 'article',
          article: {
            publishedTime: blog.publishedAt,
            modifiedTime: blog.updatedAt,
            authors: [site.name],
          },
          url: canonicalUrl,
          images: [
            { url: blog.cover || `${SITE_URL}${SITE_DEFAULT_BLOG_COVER}` },
          ],
          siteName: site.name,
        }}
      />
      <Container data-aos='fade-up'>
        <BackButton url='/blog' />
        <BlogDetail {...blog} />
      </Container>
    </>
  );
};

export default BlogDetailPage;

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const slugs = await getAllArticleSlugs();

    return {
      paths: slugs.map((slug) => ({ params: { slug } })),
      fallback: 'blocking',
    };
  } catch {
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
};

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = context.params?.slug;

  if (typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const blog = await getArticleBySlug(slug);

  if (!blog) {
    return {
      notFound: true,
      revalidate: 60,
    };
  }

  return {
    props: {
      blog,
    },
    revalidate: 60,
  };
};
