import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  BiChevronLeft as PrevIcon,
  BiChevronRight as NextIcon,
  BiStar as StarIcon,
} from 'react-icons/bi';
import { HiOutlineClock as ClockIcon } from 'react-icons/hi';
import { TbCalendarBolt as DateIcon } from 'react-icons/tb';

import Image from '@/common/components/elements/Image';
import { SITE_DEFAULT_BLOG_COVER } from '@/common/config/site';
import { formatDate } from '@/common/helpers';
import { BlogFeaturedProps } from '@/common/types/blog';
import { useI18n } from '@/i18n';

const BlogFeaturedHero = ({ data }: BlogFeaturedProps) => {
  const { locale, messages } = useI18n();
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState<number>(0);
  const featuredData = data.slice(0, 4);

  useEffect(() => {
    if (featuredData.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentFeaturedIndex((prevIndex) =>
        prevIndex === featuredData.length - 1 ? 0 : prevIndex + 1,
      );
    }, 6000);

    return () => clearInterval(intervalId);
  }, [featuredData.length]);

  if (!featuredData.length) {
    return null;
  }

  const currentFeatured = featuredData[currentFeaturedIndex];
  const nextFeatured = () => {
    setCurrentFeaturedIndex((prevIndex) =>
      prevIndex === featuredData.length - 1 ? 0 : prevIndex + 1,
    );
  };

  const prevFeatured = () => {
    setCurrentFeaturedIndex((prevIndex) =>
      prevIndex === 0 ? featuredData.length - 1 : prevIndex - 1,
    );
  };

  return (
    <div className='relative overflow-hidden rounded-3xl border shadow-lg dark:border-neutral-700'>
      <div className='relative h-[420px] overflow-hidden'>
        <Image
          src={currentFeatured.cover || SITE_DEFAULT_BLOG_COVER}
          alt={currentFeatured.title}
          fill={true}
          priority
          sizes='100vw'
          className='h-full w-full object-cover'
        />
        <div className='to-black/85 absolute inset-0 bg-gradient-to-b from-transparent via-black/50' />
      </div>

      <div className='absolute inset-0 z-10 flex w-full justify-between'>
        <div className='flex flex-col justify-between gap-6 p-6 sm:p-8'>
          <div className='flex w-fit items-center gap-x-1 rounded-full bg-lime-200 px-2.5 py-1.5 text-xs text-black'>
            <StarIcon size={16} />
            <span>{messages.blog.featuredArticle}</span>
          </div>

          <div className='flex flex-col justify-end gap-6'>
            <div className='flex flex-col space-y-3 text-white'>
              <Link href={`/blog/${currentFeatured.slug}`}>
                <h3 className='max-w-3xl text-2xl font-bold leading-normal hover:underline hover:underline-offset-4 sm:text-4xl'>
                  {currentFeatured.title}
                </h3>
              </Link>
              <p className='max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base'>
                {currentFeatured.summary}
              </p>
              <div className='flex flex-wrap gap-x-5 gap-y-2 pt-1 text-neutral-300'>
                <div className='flex items-center gap-1'>
                  <DateIcon size={16} />
                  <span className='ml-0.5 text-xs sm:text-sm'>
                    {formatDate(currentFeatured.publishedAt, undefined, locale)}
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <ClockIcon size={15} />
                  <span className='ml-0.5 text-xs sm:text-sm'>
                    {currentFeatured.readingTimeMinutes} {messages.blog.minutesRead}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex gap-2'>
              <button
                onClick={prevFeatured}
                className='h-8 w-8 rounded-md bg-white text-black transition-all duration-300 hover:scale-105 hover:text-neutral-900'
                aria-label={messages.blog.previousFeatured}
              >
                <PrevIcon size={24} />
              </button>
              <button
                onClick={nextFeatured}
                className='h-8 w-8 rounded-md bg-white text-black transition-all duration-300 hover:scale-105 hover:text-neutral-900'
                aria-label={messages.blog.nextFeatured}
              >
                <NextIcon size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className='hidden flex-col items-center justify-center space-y-5 border-l border-solid border-[#ffffff1a] px-8 sm:flex'>
          {featuredData.map((item, index: number) => (
            <button
              key={item.id}
              onClick={() => setCurrentFeaturedIndex(index)}
              className={clsx(
                'relative mb-2 h-16 w-16 overflow-hidden border-2 bg-black transition-all duration-300 hover:scale-105',
                index === currentFeaturedIndex && 'scale-105 border-sky-300',
              )}
              style={{ borderRadius: '50%' }}
            >
              <Image
                src={item.cover || SITE_DEFAULT_BLOG_COVER}
                alt={item.title}
                fill={true}
                sizes='128px'
                className='object-cover'
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogFeaturedHero;
