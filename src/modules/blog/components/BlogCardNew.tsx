import Link from 'next/link';
import { HiOutlineClock as ClockIcon } from 'react-icons/hi';
import { TbCalendarBolt as DateIcon } from 'react-icons/tb';

import Card from '@/common/components/elements/Card';
import Image from '@/common/components/elements/Image';
import { SITE_DEFAULT_BLOG_COVER } from '@/common/config/site';
import { formatDate } from '@/common/helpers';
import { BlogItemProps } from '@/common/types/blog';
import { useI18n } from '@/i18n';

interface BlogCardProps extends BlogItemProps {
  isExcerpt?: boolean;
  priority?: boolean;
}

const BlogCardNew = ({
  title,
  cover,
  publishedAt,
  slug,
  summary,
  readingTimeMinutes,
  tags,
  isExcerpt = true,
  priority = false,
}: BlogCardProps) => {
  const { locale, messages } = useI18n();

  return (
    <Link href={`/blog/${slug}`}>
      <Card className='group flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm dark:border-neutral-800'>
        <div className='relative h-52 overflow-hidden'>
          <Image
            src={cover || SITE_DEFAULT_BLOG_COVER}
            alt={title}
            fill={true}
            priority={priority}
            sizes='(max-width: 768px) 100vw, 33vw'
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-black/70 to-transparent' />
          <div className='absolute bottom-4 left-4 flex flex-wrap gap-2'>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag.slug}
                className='rounded-full bg-white/15 px-2.5 py-1 text-xs text-white backdrop-blur'
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className='flex flex-1 flex-col gap-4 p-5'>
          <div className='space-y-3'>
            <h3 className='line-clamp-2 text-lg font-semibold text-neutral-900 group-hover:text-teal-600 dark:text-neutral-100 dark:group-hover:text-teal-400'>
              {title}
            </h3>
            {isExcerpt && (
              <p className='line-clamp-3 text-sm leading-7 text-neutral-600 dark:text-neutral-400'>
                {summary}
              </p>
            )}
          </div>

          <div className='mt-auto flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400'>
            <div className='flex items-center gap-1.5'>
              <DateIcon size={16} />
              <span>{formatDate(publishedAt, undefined, locale)}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <ClockIcon size={16} />
              <span>
                {readingTimeMinutes} {messages.blog.minutesRead}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default BlogCardNew;
