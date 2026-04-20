import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { useSiteConfig } from '@/common/config/site';
import { LEARN_CONTENTS } from '@/common/constant/learn';
import { useI18n } from '@/i18n';
import LearnModule from '@/modules/learn';

const LearnPage: NextPage = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const filteredContents =
    LEARN_CONTENTS.filter((content) => content.is_show) || [];
  const pageTitle = messages.pages.learnTitle;
  const pageDescription = messages.pages.learnDescription;

  return (
    <>
      <NextSeo title={`${pageTitle} - ${site.name}`} description={pageDescription} />
      <Container data-aos='fade-up'>
        <PageHeading title={pageTitle} description={pageDescription} />
        <LearnModule contents={filteredContents} />
      </Container>
    </>
  );
};

export default LearnPage;
