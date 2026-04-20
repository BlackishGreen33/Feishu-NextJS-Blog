import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { SITE_NAME } from '@/common/config/site';
import { LEARN_CONTENTS } from '@/common/constant/learn';
import LearnModule from '@/modules/learn';

const PAGE_TITLE = '學習筆記';
const PAGE_DESCRIPTION = '這裡收錄專案內建的學習內容與示例筆記。';

const LearnPage: NextPage = () => {
  const filteredContents =
    LEARN_CONTENTS.filter((content) => content.is_show) || [];

  return (
    <>
      <NextSeo title={`${PAGE_TITLE} - ${SITE_NAME}`} />
      <Container data-aos='fade-up'>
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <LearnModule contents={filteredContents} />
      </Container>
    </>
  );
};

export default LearnPage;
