import { BsBuildings as CompanyIcon } from 'react-icons/bs';
import { HiChevronRight } from 'react-icons/hi';

import Image from '@/common/components/elements/Image';
import { EducationProps } from '@/common/types/education';
import { useI18n } from '@/i18n';

const EducationCard = ({
  school,
  major,
  logo,
  degree,
  location,
  link,
  highlights,
}: EducationProps) => {
  const { messages } = useI18n();
  const header = <h4 className='text-lg leading-7 font-semibold'>{school}</h4>;

  const summaryItems = [degree, major].filter(Boolean);
  const hasHighlights = Boolean(highlights?.length);

  return (
    <div className='space-y-4 text-(--reader-text)'>
      <div className='flex items-start gap-4'>
        <div className='mt-1 shrink-0'>
          {logo ? (
            <Image
              src={logo}
              width={40}
              height={40}
              alt={school}
              className='size-10 rounded-md object-contain'
            />
          ) : (
            <CompanyIcon size={40} aria-hidden='true' />
          )}
        </div>
        <div className='min-w-0 space-y-2'>
          {link ? (
            <a
              href={link}
              target='_blank'
              rel='noopener noreferrer'
              data-umami-event={`Click Education School: ${school}`}
              className='block underline-offset-4 outline-offset-4 outline-(--reader-accent) hover:underline focus-visible:outline-2'
            >
              {header}
            </a>
          ) : (
            header
          )}
          <div className='flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-(--reader-muted)'>
            {summaryItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          {location && (
            <p className='text-sm leading-6 text-(--reader-muted)'>
              {location}
            </p>
          )}
        </div>
      </div>
      {hasHighlights && (
        <details className='group'>
          <summary className='inline-flex min-h-9 list-none items-center gap-1 text-sm text-(--reader-muted) outline-offset-4 outline-(--reader-accent) hover:text-(--reader-text) focus-visible:outline-2 [&::-webkit-details-marker]:hidden'>
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
            {highlights?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default EducationCard;
