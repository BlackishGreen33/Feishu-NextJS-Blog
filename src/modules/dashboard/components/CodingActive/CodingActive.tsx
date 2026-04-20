import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { SiWakatime as WakatimeIcon } from 'react-icons/si';
import useSWR from 'swr';

import EmptyState from '@/common/components/elements/EmptyState';
import SectionHeading from '@/common/components/elements/SectionHeading';
import SectionSubHeading from '@/common/components/elements/SectionSubHeading';
import { SITE_WAKATIME_URL } from '@/common/config/site';
import { getDateFnsLocale } from '@/common/helpers';
import { useI18n } from '@/i18n';
import { fetcher } from '@/services/fetcher';

import CodingActiveList from './CodingActiveList';
import Overview from './Overview';

interface CodingActiveProps {
  lastUpdate?: string;
}

const CodingActive = ({ lastUpdate }: CodingActiveProps) => {
  const { locale, messages } = useI18n();
  const { data } = useSWR('/api/read-stats', fetcher);
  const [formattedLastUpdate, setFormattedLastUpdate] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const formatLastUpdate = (): void => {
      const lastUpdateDate = lastUpdate || data?.last_update;
      if (lastUpdateDate) {
        const zonedDate = toZonedTime(
          fromZonedTime(lastUpdateDate, 'Asia/Jakarta'),
          'Asia/Jakarta',
        );
        const distance = formatDistanceToNowStrict(zonedDate, {
          addSuffix: true,
          locale: getDateFnsLocale(locale),
        });
        setFormattedLastUpdate(distance);
      }
    };

    formatLastUpdate();
  }, [lastUpdate, data, locale]);

  const renderLastUpdate = () => {
    if (formattedLastUpdate) {
      return <span>{formattedLastUpdate}</span>;
    }
    return <span>{messages.common.noData}</span>;
  };

  const isLoading = data === undefined;
  const isConfigured = data?.configured !== false;
  const hasActivityData = Boolean(
    data?.languages?.length ||
      data?.categories?.length ||
      data?.human_readable_total ||
      data?.all_time_since_today?.text,
  );

  return (
    <section className='flex flex-col gap-y-2'>
      <SectionHeading
        title={messages.dashboard.weeklyStats}
        icon={<WakatimeIcon className='mr-1' />}
      />
      <SectionSubHeading>
        <div className='dark:text-neutral-400 md:flex-row md:items-center'>
          <span>{messages.dashboard.weeklyStatsDescription}</span>
          {SITE_WAKATIME_URL ? (
            <>
              <span> {messages.dashboard.source}</span>
              <Link
                href={SITE_WAKATIME_URL}
                className='hover:text-neutral-900 hover:underline dark:hover:text-neutral-100'
              >
                WakaTime
              </Link>
            </>
          ) : null}
        </div>
        <div className='text-sm text-neutral-600 dark:text-neutral-500'>
          {messages.dashboard.lastUpdated}
          {renderLastUpdate()}
        </div>
      </SectionSubHeading>

      {isLoading ? (
        <div className='py-5 text-sm text-neutral-500 dark:text-neutral-400'>
          {messages.common.loadingEllipsis}
        </div>
      ) : hasActivityData ? (
        <>
          <Overview data={data} />
          <CodingActiveList data={data} />
        </>
      ) : (
        <EmptyState
          message={
            isConfigured
              ? messages.dashboard.wakatimeUnavailable
              : messages.dashboard.wakatimeNotConfigured
          }
        />
      )}
    </section>
  );
};

export default CodingActive;
