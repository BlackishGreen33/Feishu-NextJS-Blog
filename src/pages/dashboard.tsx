import { GetStaticProps, NextPage } from 'next';
import { NextSeo } from 'next-seo';
import { SWRConfig } from 'swr';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';
import Dashboard from '@/modules/dashboard';
import { getGithubUser } from '@/services/github';

interface DashboardPageProps {
  fallback: Record<string, unknown>;
}

const DashboardPage: NextPage<DashboardPageProps> = ({ fallback }) => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const pageTitle = messages.pages.dashboardTitle;
  const pageDescription = messages.dashboard.pageDescription;

  return (
    <SWRConfig value={{ fallback }}>
      <NextSeo title={`${pageTitle} - ${site.name}`} description={pageDescription} />
      <Container data-aos='fade-up'>
        <PageHeading title={pageTitle} description={pageDescription} />
        <Dashboard />
      </Container>
    </SWRConfig>
  );
};

export default DashboardPage;

export const getStaticProps: GetStaticProps = async () => {
  try {
    const githubUserPersonal = await getGithubUser('personal');

    return {
      props: {
        fallback: {
          '/api/github?type=personal': githubUserPersonal?.data || null,
        },
      },
      revalidate: 60,
    };
  } catch {
    return {
      props: {
        fallback: {},
      },
      revalidate: 60,
    };
  }
};
