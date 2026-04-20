import Link from 'next/link';
import clsx from 'clsx';

import {
  SITE_PROFILE_HANDLE,
  SITE_PROFILE_IMAGE,
  useSiteConfig,
} from '@/common/config/site';

import Image from '../elements/Image';

interface ProfileHeaderProps {
  expandMenu: boolean;
  imageSize: number;
  isScrolled?: boolean;
}

const ProfileHeader = ({ expandMenu, imageSize }: ProfileHeaderProps) => {
  const site = useSiteConfig();

  return (
    <div
      className={clsx(
        'flex w-full flex-grow items-center gap-4 lg:flex-col lg:items-start lg:gap-0.5 lg:px-2',
        expandMenu && 'flex-col !items-start',
      )}
    >
      <Image
        src={SITE_PROFILE_IMAGE}
        alt={site.profileName}
        width={expandMenu ? 80 : imageSize}
        height={expandMenu ? 80 : imageSize}
        priority
        unoptimized
        rounded='rounded-full'
        className='rotate-3 dark:border-neutral-600 lg:hover:scale-105'
      />
      <>
        <div className='mt-1 flex items-center gap-2 lg:mt-4'>
          <Link href='/' passHref>
            <h2 className='flex-grow  text-lg font-medium lg:text-xl'>
              {site.profileName}
            </h2>
          </Link>
        </div>
        <div className='hidden text-[15px] text-neutral-600 transition-all duration-300 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400 lg:flex'>
          {SITE_PROFILE_HANDLE}
        </div>
      </>
    </div>
  );
};

export default ProfileHeader;
