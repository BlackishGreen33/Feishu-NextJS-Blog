import clsx from 'clsx';

import Button from '@/common/components/elements/Button';
import { useMenuData } from '@/common/constant/menu';
import { useI18n } from '@/i18n';

const SocialMediaList = () => {
  const { messages } = useI18n();
  const { socialMedia } = useMenuData();
  const handleAction = (link: string) => window.open(link, '_blank');

  return (
    <div className='space-y-5 pb-2'>
      <h3 className='text-lg font-medium'>{messages.contact.socialTitle}</h3>
      <div className='flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center'>
        {socialMedia.map((item, index: number) => (
          <Button
            className={clsx(
              'flex w-full items-center justify-center transition-all duration-300 hover:scale-105 md:w-auto md:min-w-[190px]',
              item?.className,
            )}
            key={index}
            onClick={() => handleAction(item?.href)}
            icon={item?.icon}
            data-umami-event={item?.eventName}
          >
            {item?.title}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SocialMediaList;
