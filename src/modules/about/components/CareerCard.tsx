import { differenceInMonths, differenceInYears } from 'date-fns';
import { BsBuildings as CompanyIcon } from 'react-icons/bs';
import { HiChevronRight } from 'react-icons/hi';

import Image from '@/common/components/elements/Image';
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
  asOf,
}: CareerProps & { asOf: number | null }) => {
  const { locale, messages } = useI18n();
  const durationEnd = end_date
    ? new Date(end_date)
    : asOf === null
      ? null
      : new Date(asOf);
  const durationYears = durationEnd
    ? differenceInYears(durationEnd, new Date(start_date))
    : 0;
  const durationMonths = durationEnd
    ? (differenceInMonths(durationEnd, new Date(start_date)) % 12) + 1
    : 0;
  const durationText = !durationEnd
    ? ''
    : locale === 'en'
      ? `${durationYears > 0 ? `${durationYears} yr ` : ''}${durationMonths} mo`
      : `${durationYears > 0 ? `${durationYears} 年 ` : ''}${durationMonths} ${locale === 'zh-CN' ? '个月' : '個月'}`;
  const companyMeta = [company_legal_name, location].filter(Boolean);
  const detailMeta = [durationText, type, location_type].filter(Boolean);
  const hasResponsibilities = Boolean(responsibilities?.length);

  return (
    <div className='space-y-4 text-(--reader-text)'>
      <div className='flex items-start gap-4'>
        <div className='mt-1 shrink-0'>
          {logo ? (
            <Image
              src={logo}
              width={40}
              height={40}
              alt={company}
              className='size-10 rounded-md object-contain'
            />
          ) : (
            <CompanyIcon size={40} aria-hidden='true' />
          )}
        </div>
        <div className='min-w-0 space-y-2'>
          <h4 className='text-lg leading-7 font-semibold'>{position}</h4>
          <div className='space-y-1 text-sm leading-6 text-(--reader-muted)'>
            <div className='font-medium text-(--reader-text)'>
              {link ? (
                <a
                  href={link}
                  target='_blank'
                  rel='noopener noreferrer'
                  data-umami-event={`Click Career Company Name: ${company}`}
                  className='underline-offset-4 outline-offset-4 outline-(--reader-accent) hover:underline focus-visible:outline-2'
                >
                  {company}
                </a>
              ) : (
                <span>{company}</span>
              )}
            </div>
            <div className='flex flex-wrap gap-x-4 gap-y-1'>
              {companyMeta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className='flex flex-wrap gap-x-4 gap-y-1'>
              {detailMeta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {hasResponsibilities && (
        <details className='group'>
          <summary className='inline-flex min-h-9 list-none items-center gap-1 text-sm text-(--reader-muted) underline-offset-4 outline-offset-4 outline-(--reader-accent) hover:text-(--reader-text) focus-visible:outline-2 [&::-webkit-details-marker]:hidden'>
            <HiChevronRight
              size={18}
              aria-hidden='true'
              className='transition-transform duration-250 ease-out group-open:rotate-90 motion-reduce:transition-none'
            />
            <span className='group-open:hidden'>
              {messages.common.viewDetails}
            </span>
            <span className='hidden group-open:inline'>
              {messages.common.hideDetails}
            </span>
          </summary>
          <ul className='mt-2 ml-5 list-disc space-y-2 text-sm leading-7 text-(--reader-muted)'>
            {responsibilities?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default CareerCard;
