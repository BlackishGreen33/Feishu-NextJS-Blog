import clsx from 'clsx';

import { useI18n } from '@/i18n';

import Progress from './Progress';

interface ItemProps {
  name: string;
  hours: number;
  minutes: number;
}

interface CodingActiveListProps {
  data?: {
    languages?: ItemProps[];
    categories?: ItemProps[];
  };
}

const sumTotalFromArray = <T extends { hours: number; minutes: number }>(
  data: T[],
  key: keyof T,
) => {
  return (
    data.reduce(
      (previousValue, currentValue) =>
        previousValue + (currentValue[key] as number),
      0,
    ) ?? 0
  );
};

const formatDuration = (hours: number, minutes: number) => {
  const totalMinutes = hours * 60 + minutes;
  const normalizedHours = Math.floor(totalMinutes / 60);
  const normalizedMinutes = totalMinutes % 60;

  return `${normalizedHours} 小時 ${normalizedMinutes} 分鐘`;
};

const CodingActiveList = ({ data }: CodingActiveListProps) => {
  const { locale } = useI18n();
  const getLanguagesTotalHours = sumTotalFromArray<ItemProps>(
    data?.languages || [],
    'hours',
  );
  const getLanguagesTotalMinutes = sumTotalFromArray<ItemProps>(
    data?.languages || [],
    'minutes',
  );
  const getLanguagesTotalTimeDisplay =
    locale === 'en'
      ? `${getLanguagesTotalHours}h ${getLanguagesTotalMinutes}m`
      : formatDuration(getLanguagesTotalHours, getLanguagesTotalMinutes).replace(
          '小時',
          locale === 'zh-CN' ? '小时' : '小時',
        );

  const getEditorTotalHours = sumTotalFromArray<ItemProps>(
    data?.categories || [],
    'hours',
  );
  const getEditorTotalMinutes = sumTotalFromArray<ItemProps>(
    data?.categories || [],
    'minutes',
  );
  const getEditorTotalTimeDisplay =
    locale === 'en'
      ? `${getEditorTotalHours}h ${getEditorTotalMinutes}m`
      : formatDuration(getEditorTotalHours, getEditorTotalMinutes).replace(
          '小時',
          locale === 'zh-CN' ? '小时' : '小時',
        );

  const actives = [
    {
      title: locale === 'en' ? 'Languages' : locale === 'zh-CN' ? '语言' : '語言',
      total: getLanguagesTotalTimeDisplay,
      data: data?.languages,
      styles: {
        bg: 'bg-gradient-to-r from-amber-400 to-rose-600',
      },
    },
    {
      title: locale === 'en' ? 'Activity type' : locale === 'zh-CN' ? '活动类型' : '活動類型',
      total: getEditorTotalTimeDisplay,
      data: data?.categories,
      styles: {
        bg: 'bg-gradient-to-r from-blue-400 to-purple-600',
      },
    },
  ];

  if (!data) {
    return null;
  }

  return (
    <div className='mt-2 flex flex-col gap-6 sm:flex-row sm:gap-4'>
      {actives.map((item) => (
        <div
          key={item?.title}
          className={clsx(
            item?.styles?.bg,
            'relative flex flex-1 flex-col gap-2 rounded-lg p-[2px]',
          )}
        >
          <div className='h-full w-full rounded-lg bg-neutral-50 p-2 dark:bg-dark'>
            <p className='absolute -top-3 left-3 bg-neutral-50 px-2 dark:bg-dark'>
              {item?.title}
            </p>

            <ul className='flex flex-col gap-1 px-4 py-3'>
              {item?.data?.map((subItem) => (
                <li key={subItem?.name}>
                  <Progress data={subItem} className={item?.styles?.bg} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CodingActiveList;
