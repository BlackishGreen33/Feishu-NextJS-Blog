import React from 'react';
import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';
import Playground from '@/modules/playground';

const PlaygroundPage: NextPage = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const pageTitle = messages.pages.playgroundTitle;

  return (
    <>
      <NextSeo title={`${pageTitle} - ${site.name}`} />
      <Container className='!mt-0 pt-20 md:pt-0' data-aos='fade-up'>
        <Playground id='playground' isHeading />
      </Container>
    </>
  );
};

export default PlaygroundPage;
