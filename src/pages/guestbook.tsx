import { NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';
import Chat from '@/modules/chat';

const GuestBookPage: NextPage = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const pageTitle = messages.pages.guestbookTitle;
  const pageDescription = messages.pages.guestbookDescription;

  return (
    <>
      <NextSeo title={`${pageTitle} - ${site.name}`} description={pageDescription} />
      <Container data-aos='fade-up'>
        <PageHeading title={pageTitle} description={pageDescription} />
        <Chat />
      </Container>
    </>
  );
};

export default GuestBookPage;
