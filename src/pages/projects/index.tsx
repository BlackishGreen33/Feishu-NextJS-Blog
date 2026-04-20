import { useState } from 'react';
import { GetStaticProps, NextPage } from 'next';
import { NextSeo } from 'next-seo';

import Container from '@/common/components/elements/Container';
import PageHeading from '@/common/components/elements/PageHeading';
import { useSiteConfig } from '@/common/config/site';
import { ProjectItemProps } from '@/common/types/projects';
import { useI18n } from '@/i18n';
import Projects from '@/modules/projects';
import { getProjectsFromFirebase } from '@/server/firebase-db';

interface ProjectsPageProps {
  projects: ProjectItemProps[];
}

const ProjectsPage: NextPage<ProjectsPageProps> = ({ projects }) => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const [visibleProjects, setVisibleProjects] = useState(6);
  const pageTitle = messages.pages.projectsTitle;
  const pageDescription = messages.pages.projectsDescription;

  const loadMore = () => setVisibleProjects((prev) => prev + 2);
  const hasMore = visibleProjects < projects.length;

  return (
    <>
      <NextSeo
        title={`${pageTitle} - ${site.name}`}
        description={pageDescription}
      />
      <Container data-aos='fade-up'>
        <PageHeading title={pageTitle} description={pageDescription} />
        <Projects
          projects={projects.slice(0, visibleProjects)}
          loadMore={loadMore}
          hasMore={hasMore}
        />
      </Container>
    </>
  );
};

export default ProjectsPage;

export const getStaticProps: GetStaticProps = async () => {
  try {
    return {
      props: {
        projects: await getProjectsFromFirebase(),
      },
      revalidate: 60,
    };
  } catch {
    return {
      props: {
        projects: [],
      },
      revalidate: 60,
    };
  }
};
