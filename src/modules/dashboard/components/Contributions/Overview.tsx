import { useI18n } from '@/i18n';

import OverviewItem from './OverviewItem';

interface OverviewProps {
  data: {
    totalContributions?: number;
    weeks?: {
      contributionDays: {
        contributionCount: number;
      }[];
    }[];
  };
}

const Overview = ({ data }: OverviewProps) => {
  const { locale } = useI18n();
  const totalContributions = data?.totalContributions || 0;
  const weeks = data?.weeks || [];

  const totalThisWeekContribution =
    weeks[weeks.length - 1]?.contributionDays
      ?.map((item) => item.contributionCount)
      ?.reduce(
        (previousValue, currentValue) => previousValue + currentValue,
        0,
      ) || 0;
  const totalContributionList = weeks
    .map((week) =>
      week.contributionDays.map(
        (contributionDay) => contributionDay.contributionCount,
      ),
    )
    .flat();

  const bestContribution = Math.max(...totalContributionList) || 0;
  const averageContribution = totalContributionList.length
    ? totalContributions / totalContributionList.length
    : 0;

  return (
    <div className='grid grid-cols-2 gap-3 py-2 sm:grid-cols-4'>
      <OverviewItem
        label={
          locale === 'en' ? 'Total' : locale === 'zh-CN' ? '总贡献' : '總貢獻'
        }
        value={totalContributions}
      />
      <OverviewItem
        label={
          locale === 'en' ? 'This week' : locale === 'zh-CN' ? '本周' : '本週'
        }
        value={totalThisWeekContribution}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'Best day'
            : locale === 'zh-CN'
              ? '最佳单日'
              : '最佳單日'
        }
        value={bestContribution}
      />
      <OverviewItem
        label={
          locale === 'en' ? 'Daily avg' : locale === 'zh-CN' ? '日均' : '日均'
        }
        value={averageContribution}
        unit={locale === 'en' ? '/ day' : locale === 'zh-CN' ? '/ 天' : '/ 天'}
      />
    </div>
  );
};

export default Overview;
