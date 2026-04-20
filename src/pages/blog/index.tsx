import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import BlogListNew from '@/modules/blog';

const PAGE_TITLE = '部落格';

const BlogPage: NextPage = () => {
  return (
    <>
      <NextSeo title={`${PAGE_TITLE} - 飛書 Next.js 部落格`} />
      <Container className='xl:!-mt-5' data-aos='fade-up'>
        <BlogListNew />
      </Container>
    </>
  );
};

export default BlogPage;
