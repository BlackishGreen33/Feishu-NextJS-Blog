import { useState } from 'react';
import { differenceInMonths, differenceInYears, format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { BsBuildings as CompanyIcon } from 'react-icons/bs';
import { HiChevronRight } from 'react-icons/hi';

import Card from '@/common/components/elements/Card';
import Image from '@/common/components/elements/Image';
import { formatMonthYear } from '@/common/helpers';
import cn from '@/common/libs/cn';
import { CareerProps } from '@/common/types/careers';
import { useI18n } from '@/i18n';

const CareerCard = ({
  position,
  company,
  company_legal_name,
  logo,
  location,
  location_type,
  start_date,
  end_date,
  link,
  type,
  responsibilities,
}: CareerProps) => {
  const { locale, messages } = useI18n();
  const [isShowResponsibility, setIsShowResponsibility] =
    useState<boolean>(false);

  const startDateFormatted = formatMonthYear(start_date, locale);
  const endDateFormatted = end_date
    ? formatMonthYear(end_date, locale)
    : messages.common.present;

  const durationYears = differenceInYears(
    new Date(end_date || Date.now()),
    new Date(start_date),
  );
  const durationMonths =
    (differenceInMonths(
      new Date(end_date || Date.now()),
      new Date(start_date),
    ) %
      12) +
    1;

  const durationText =
    locale === 'en'
      ? `${durationYears > 0 ? `${durationYears} yr ` : ''}${durationMonths} mo`
      : `${durationYears > 0 ? `${durationYears} 年 ` : ''}${durationMonths} ${locale === 'zh-CN' ? '个月' : '個月'}`;
  const companyMeta = [company_legal_name, location].filter(Boolean);
  const detailMeta = [durationText, type, location_type].filter(Boolean);
  const hasResponsibilities = Boolean(responsibilities?.length);

  return (
    <Card className='flex gap-5 border border-neutral-300 px-6 py-4 dark:border-neutral-900'>
      <div className='mt-1.5 w-fit'>
        {logo ? (
          <Image
            src={logo}
            width={55}
            height={55}
            alt={company}
            className='h-14 w-14 rounded-md object-contain hover:scale-110'
          />
        ) : (
          <CompanyIcon size={50} />
        )}
      </div>
      <div className='w-4/5 space-y-3'>
        <div className='space-y-1'>
          <h6>{position}</h6>
          <div className='space-y-1 text-sm text-neutral-600 dark:text-neutral-400'>
            <div className='flex flex-col gap-1 md:flex-row md:items-center md:gap-2'>
              {link ? (
                <a
                  href={link}
                  target='_blank'
                  rel='noopener noreferrer'
                  data-umami-event={`Click Career Company Name: ${company}`}
                >
                  <span className='cursor-pointer underline-offset-2 hover:text-dark hover:underline hover:dark:text-white'>
                    {company}
                  </span>
                </a>
              ) : (
                <span>{company}</span>
              )}
              {companyMeta.map((item) => (
                <div key={item} className='flex items-center gap-2'>
                  <span className='hidden text-neutral-300 dark:text-neutral-700 lg:block'>
                    •
                  </span>
                  <span className='text-neutral-500'>{item}</span>
                </div>
              ))}
            </div>
            <div className='flex flex-col gap-2 md:flex-row md:text-[13px]'>
              <div className='flex gap-1'>
                <span>
                  {startDateFormatted} - {endDateFormatted}
                </span>
              </div>
              {detailMeta.map((item) => (
                <div key={item} className='flex items-center gap-2'>
                  <span className='hidden text-neutral-300 dark:text-neutral-700 lg:block'>
                    •
                  </span>
                  <span className='text-neutral-500 dark:text-neutral-500'>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {hasResponsibilities ? (
          <button
            onClick={() => setIsShowResponsibility(!isShowResponsibility)}
            className='-ml-1 mt-5 flex items-center gap-1 text-sm text-neutral-500'
          >
            <HiChevronRight
              size={18}
              className={cn({
                'rotate-90 transition-all duration-300': isShowResponsibility,
              })}
            />
            {isShowResponsibility
              ? messages.common.hideDetails
              : messages.common.viewDetails}
          </button>
        ) : null}
        <AnimatePresence>
          {isShowResponsibility && hasResponsibilities && (
            <motion.ul
              className='ml-5 list-disc space-y-1 pb-2 text-sm leading-normal text-neutral-600 dark:text-neutral-400'
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {responsibilities?.map((item) => (
                <motion.li key={item} layout>
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default CareerCard;
