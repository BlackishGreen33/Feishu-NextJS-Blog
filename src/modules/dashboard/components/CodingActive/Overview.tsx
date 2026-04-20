import { formatDate } from '@/common/helpers';
import { useI18n } from '@/i18n';

import OverviewItem from './OverviewItem';

interface OverviewProps {
  data: {
    human_readable_total?: string;
    human_readable_daily_average?: string;
    best_day?: {
      text?: string;
      date?: string;
    };
    all_time_since_today?: {
      text?: string;
    };
    start_date?: string;
    end_date?: string;
  };
}

const Overview = ({ data }: OverviewProps) => {
  const { locale, messages } = useI18n();
  const fallbackText = messages.common.noData;
  const dailyTotal = data?.human_readable_total || fallbackText;
  const dailyAverage = data?.human_readable_daily_average || fallbackText;
  const bestDayText = data?.best_day?.text || fallbackText;
  const bestDayDate = data?.best_day?.date;
  const allTimeSinceToday = data?.all_time_since_today?.text || fallbackText;
  const startDate = data?.start_date
    ? formatDate(data.start_date, undefined, locale)
    : fallbackText;
  const endDate = data?.end_date
    ? formatDate(data.end_date, undefined, locale)
    : fallbackText;
  const bestDay = bestDayDate
    ? `${formatDate(bestDayDate, undefined, locale)} (${bestDayText})`
    : fallbackText;

  return (
    <div className='mb-1 grid gap-3 py-2 md:grid-cols-2'>
      <OverviewItem
        label={
          locale === 'en'
            ? 'Start date'
            : locale === 'zh-CN'
              ? '开始日期'
              : '起始日期'
        }
        value={startDate}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'End date'
            : locale === 'zh-CN'
              ? '结束日期'
              : '結束日期'
        }
        value={endDate}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'Average coding time/day'
            : locale === 'zh-CN'
              ? '平均每日编码时间'
              : '平均每日編碼時間'
        }
        value={dailyAverage}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'Coding time this week'
            : locale === 'zh-CN'
              ? '本周编码时间'
              : '本週編碼時間'
        }
        value={dailyTotal}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'Best single day'
            : locale === 'zh-CN'
              ? '最佳单日编码'
              : '最佳單日編碼'
        }
        value={bestDay}
      />
      <OverviewItem
        label={
          locale === 'en'
            ? 'All-time total'
            : locale === 'zh-CN'
              ? '累计总时数'
              : '累積總時數'
        }
        value={allTimeSinceToday}
      />
    </div>
  );
};

export default Overview;
