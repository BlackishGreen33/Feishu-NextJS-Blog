import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';
import BlogListNew from '@/modules/blog';

const BlogPage: NextPage = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const pageTitle = messages.pages.blogTitle;

  return (
    <>
      <NextSeo title={`${pageTitle} - ${site.name}`} />
      <Container className='xl:!-mt-5' data-aos='fade-up'>
        <BlogListNew />
      </Container>
    </>
  );
};

export default BlogPage;
