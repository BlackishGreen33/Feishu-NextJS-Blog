import Link from 'next/link';
import { BsGithub as GithubIcon } from 'react-icons/bs';
import useSWR from 'swr';

import EmptyState from '@/common/components/elements/EmptyState';
import SectionHeading from '@/common/components/elements/SectionHeading';
import SectionSubHeading from '@/common/components/elements/SectionSubHeading';
import { useI18n } from '@/i18n';
import { fetcher } from '@/services/fetcher';

import Calendar from './Calendar';
import Overview from './Overview';

type ContributionsProps = {
  username: string;
  type: string;
  endpoint: string;
};

const Contributions = ({ username, endpoint }: ContributionsProps) => {
  const { messages } = useI18n();
  const { data } = useSWR(endpoint, fetcher);

  const isLoading = data === undefined;
  const isConfigured = data?.configured !== false;
  const contributionCalendar =
    data?.contributionsCollection?.contributionCalendar;
  const hasContributionData = Boolean(contributionCalendar?.weeks?.length);

  return (
    <section className='flex flex-col gap-y-2'>
      <SectionHeading
        title={messages.dashboard.githubContributions}
        icon={<GithubIcon className='mr-1' />}
      />
      <SectionSubHeading>
        <p className='dark:text-neutral-400'>
          {messages.dashboard.githubDescription}
        </p>
        <Link
          href={`https://github.com/${username}`}
          target='_blank'
          passHref
          className='font-code text-sm text-neutral-400 hover:text-neutral-700 dark:text-neutral-600 hover:dark:text-neutral-400'
        >
          @{username}
        </Link>
      </SectionSubHeading>

      {isLoading && (
        <div className='py-5 text-sm text-neutral-500 dark:text-neutral-400'>
          {messages.common.loadingEllipsis}
        </div>
      )}

      {!isLoading && !hasContributionData && (
        <EmptyState
          message={
            isConfigured
              ? messages.dashboard.githubUnavailable
              : messages.dashboard.githubNotConfigured
          }
        />
      )}

      {!isLoading && hasContributionData && (
        <div className='space-y-3'>
          <Overview data={contributionCalendar} />
          <Calendar data={contributionCalendar} />
        </div>
      )}
    </section>
  );
};

export default Contributions;
