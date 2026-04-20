import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, isToday } from 'date-fns';

import { getDateFnsLocale } from '@/common/helpers';
import { useI18n } from '@/i18n';

interface ChatTimeProps {
  datetime: string;
}

const ChatTime = ({ datetime }: ChatTimeProps) => {
  const { locale } = useI18n();
  const [formattedTime, setFormattedTime] = useState<string>(
    formatDistanceToNow(new Date(datetime), {
      addSuffix: true,
      locale: getDateFnsLocale(locale),
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedTime(
        formatDistanceToNow(new Date(datetime), {
          addSuffix: true,
          locale: getDateFnsLocale(locale),
        }),
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [datetime, locale]);

  return (
    <div className='text-xs text-neutral-500'>
      {isToday(new Date(datetime))
        ? formattedTime
        : format(
            new Date(datetime),
            locale === 'en' ? 'MMM d, yyyy HH:mm' : 'yyyy/MM/dd HH:mm',
          )}
    </div>
  );
};

export default ChatTime;
