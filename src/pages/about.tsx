import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';
import About from '@/modules/about';

const AboutPage: NextPage = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const pageTitle = messages.pages.aboutTitle;
  const pageDescription = site.aboutPageDescription;

  return (
    <>
      <NextSeo
        title={`${pageTitle} - ${site.name}`}
        description={pageDescription}
      />
      <Container data-aos='fade-up'>
        <PageHeading title={pageTitle} description={pageDescription} />
        <About />
      </Container>
    </>
  );
};

export default AboutPage;
