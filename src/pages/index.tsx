import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import { useSiteConfig } from '@/common/config/site';
import Home from '@/modules/home';

const HomePage: NextPage = () => {
  const site = useSiteConfig();

  return (
    <>
      <NextSeo title={`${site.title} - ${site.name}`} />
      <Container data-aos='fade-up'>
        <Home />
      </Container>
    </>
  );
};

export default HomePage;
