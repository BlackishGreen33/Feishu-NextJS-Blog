import { useEffect, useState } from 'react';

import EmptyState from '@/common/components/elements/EmptyState';
import { getCareers } from '@/common/constant/careers';
import { formatMonthYear } from '@/common/helpers';
import { useI18n } from '@/i18n';

import CareerCard from './CareerCard';
import Timeline from './Timeline';

const CareerList = () => {
  const { locale, messages } = useI18n();
  const careers = getCareers(locale);
  const [asOf, setAsOf] = useState<number | null>(null);
  useEffect(() => {
    // Read the browser clock after hydration, once for the list and all cards.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAsOf(Date.now());
  }, []);

  if (careers.length === 0) {
    return <EmptyState message={messages.about.career.empty} />;
  }

  const sortedCareers = [...careers].sort((a, b) => {
    const aEndDate = a.end_date
      ? Date.parse(a.end_date)
      : (asOf ?? Number.POSITIVE_INFINITY);
    const bEndDate = b.end_date
      ? Date.parse(b.end_date)
      : (asOf ?? Number.POSITIVE_INFINITY);

    if (aEndDate !== bEndDate) {
      return bEndDate - aEndDate;
    }

    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  return (
    <Timeline
      label={messages.about.tabs.career}
      data={sortedCareers.map((career) => ({
        id: `${career.company}-${career.start_date}`,
        title: `${formatMonthYear(career.start_date, locale)} - ${
          career.end_date
            ? formatMonthYear(career.end_date, locale)
            : messages.common.present
        }`,
        content: <CareerCard {...career} asOf={asOf} />,
      }))}
    />
  );
};

export default CareerList;
