import { GetServerSideProps, NextPage } from 'next';
import { NextSeo } from 'next-seo';

import BackButton from '@/common/components/elements/BackButton';
import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { getCanonicalUrl } from '@/common/config/seo';
import { useSiteConfig } from '@/common/config/site';
import { ProjectItemProps } from '@/common/types/projects';
import { useI18n } from '@/i18n';
import ProjectDetail from '@/modules/projects/components/ProjectDetail';
import { getProjectBySlugFromFirebase } from '@/server/firebase-db';

interface ProjectsDetailPageProps {
  project: ProjectItemProps;
}

const ProjectsDetailPage: NextPage<ProjectsDetailPageProps> = ({ project }) => {
  const { locale } = useI18n();
  const site = useSiteConfig();
  const canonicalUrl = getCanonicalUrl(`/projects/${project.slug}`, locale);

  return (
    <>
      <NextSeo
        title={`${project.title} - ${site.name}`}
        description={project.description}
        canonical={canonicalUrl}
        openGraph={{
          type: 'article',
          article: {
            publishedTime: project.updated_at.toString(),
            modifiedTime: project.updated_at.toString(),
            authors: [site.name],
          },
          url: canonicalUrl,
          images: project.image ? [{ url: project.image }] : [],
          siteName: site.name,
        }}
      />
      <Container data-aos='fade-up'>
        <BackButton url='/projects' />
        <PageHeading title={project.title} description={project.description} />
        <ProjectDetail {...project} />
      </Container>
    </>
  );
};

export default ProjectsDetailPage;

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const response = await getProjectBySlugFromFirebase(String(params?.slug));

    if (response === null) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        project: response,
      },
    };
  } catch {
    return {
      notFound: true,
    };
  }
};
