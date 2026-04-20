import EmptyState from '@/common/components/elements/EmptyState';
import { getCareers } from '@/common/constant/careers';
import { useI18n } from '@/i18n';

import CareerCard from './CareerCard';

const CareerList = () => {
  const { locale, messages } = useI18n();
  const careers = getCareers(locale);

  if (careers.length === 0) {
    return <EmptyState message={messages.about.career.empty} />;
  }

  const sortedCareers = [...careers].sort((a, b) => {
    const aEndDate = new Date(a.end_date || Date.now()).getTime();
    const bEndDate = new Date(b.end_date || Date.now()).getTime();

    if (aEndDate !== bEndDate) {
      return bEndDate - aEndDate;
    }

    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  return (
    <section className='space-y-6'>
      <div className='grid gap-3'>
        {sortedCareers.map((career, index) => (
          <CareerCard key={index} {...career} />
        ))}
      </div>
    </section>
  );
};

export default CareerList;
