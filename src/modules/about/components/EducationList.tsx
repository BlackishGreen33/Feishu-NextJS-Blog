import EmptyState from '@/common/components/elements/EmptyState';
import { getEducation } from '@/common/constant/education';
import { useI18n } from '@/i18n';

import EducationCard from './EducationCard';
import Timeline from './Timeline';

const EducationList = () => {
  const { locale, messages } = useI18n();
  const education = getEducation(locale);

  if (education.length === 0) {
    return <EmptyState message={messages.about.education.empty} />;
  }

  const sortedEducation = [...education].sort((a, b) => {
    const aEndYear = a.end_year ?? Number.MAX_SAFE_INTEGER;
    const bEndYear = b.end_year ?? Number.MAX_SAFE_INTEGER;

    if (aEndYear !== bEndYear) {
      return bEndYear - aEndYear;
    }

    return b.start_year - a.start_year;
  });

  return (
    <Timeline
      label={messages.about.tabs.education}
      data={sortedEducation.map((item) => ({
        id: `${item.school}-${item.start_year}`,
        title: `${item.start_year} - ${item.end_year ?? messages.common.present}`,
        content: <EducationCard {...item} />,
      }))}
    />
  );
};

export default EducationList;
