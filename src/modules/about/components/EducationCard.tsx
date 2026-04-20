import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BsBuildings as CompanyIcon } from 'react-icons/bs';
import { HiChevronRight } from 'react-icons/hi';

import Card from '@/common/components/elements/Card';
import Image from '@/common/components/elements/Image';
import cn from '@/common/libs/cn';
import { EducationProps } from '@/common/types/education';
import { useI18n } from '@/i18n';

const EducationCard = ({
  school,
  major,
  logo,
  degree,
  start_year,
  end_year,
  location,
  link,
  highlights,
}: EducationProps) => {
  const { messages } = useI18n();
  const [isShowHighlights, setIsShowHighlights] = useState(false);
  const header = (
    <h6 className={link ? 'cursor-pointer underline-offset-2 hover:text-dark hover:underline hover:dark:text-white' : ''}>
      {school}
    </h6>
  );

  const summaryItems = [degree, major].filter(Boolean);
  const metaItems = [
    `${start_year} - ${end_year || messages.common.present}`,
    location,
  ].filter(Boolean);
  const hasHighlights = Boolean(highlights?.length);

  return (
    <Card className='flex gap-5 border border-neutral-300 px-6 py-4 dark:border-neutral-900'>
      <div className='mt-1.5 w-fit'>
        {logo ? (
          <Image
            src={logo}
            width={55}
            height={55}
            alt={school}
            className='h-14 w-14 rounded-md object-contain hover:scale-110'
          />
        ) : (
          <CompanyIcon size={50} />
        )}
      </div>

      <div className='w-4/5 space-y-3'>
        {link ? (
          <a
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            data-umami-event={`Click Education School: ${school}`}
          >
            {header}
          </a>
        ) : (
          header
        )}
        <div className='space-y-2 text-sm text-neutral-600 dark:text-neutral-400'>
          {summaryItems.length > 0 ? (
            <div className='flex flex-col gap-1 md:flex-row md:gap-2'>
              {summaryItems.map((item, index) => (
                <div key={item} className='flex items-center gap-2'>
                  {index > 0 ? (
                    <span className='hidden text-neutral-300 dark:text-neutral-700 md:flex'>
                      •
                    </span>
                  ) : null}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
          {metaItems.length > 0 ? (
            <div className='flex flex-col gap-3 md:flex-row md:text-[13px]'>
              {metaItems.map((item, index) => (
                <div
                  key={item}
                  className='flex gap-1 text-neutral-500 dark:text-neutral-500'
                >
                  {index > 0 ? (
                    <span className='hidden text-neutral-300 dark:text-neutral-700 lg:block'>
                      •
                    </span>
                  ) : null}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {hasHighlights ? (
          <button
            onClick={() => setIsShowHighlights(!isShowHighlights)}
            className='-ml-1 flex items-center gap-1 text-sm text-neutral-500'
          >
            <HiChevronRight
              size={18}
              className={cn(
                'transition-all duration-300',
                isShowHighlights && 'rotate-90',
              )}
            />
            {isShowHighlights
              ? messages.common.hideDetails
              : messages.common.viewDetails}
          </button>
        ) : null}
        <AnimatePresence>
          {isShowHighlights && hasHighlights ? (
            <motion.ul
              className='ml-5 list-disc space-y-1 pb-2 text-sm leading-normal text-neutral-600 dark:text-neutral-400'
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {highlights?.map((item) => (
                <motion.li key={item} layout>
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default EducationCard;
