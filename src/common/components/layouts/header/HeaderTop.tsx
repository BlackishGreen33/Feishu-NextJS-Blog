import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { FiMenu as MenuIcon } from 'react-icons/fi';
import { MdClose as CloseIcon } from 'react-icons/md';

import ThemeSwitcher from '@/common/components/elements/ThemeSwitcher';
import { SITE_PROFILE_IMAGE, useSiteConfig } from '@/common/config/site';
import { useMenuData } from '@/common/constant/menu';

import Image from '../../elements/Image';
import SearchBox from '../../elements/SearchBox';
import Profile from '../../sidebar/Profile';

const HeaderTop = () => {
  const [showMenu, setShowMenu] = useState(false);
  const site = useSiteConfig();
  const router = useRouter();
  const { menuItems } = useMenuData();

  const menus = menuItems.filter((item) => item.isShow && item.href !== '/');

  return (
    <header>
      <div className='mx-8 hidden items-center justify-between gap-5 py-8 lg:flex'>
        <div className='flex items-center gap-5'>
          <Image
            src={SITE_PROFILE_IMAGE}
            alt={site.profileName}
            width={40}
            height={40}
            priority
            unoptimized
            rounded='rounded-full'
            className='rotate-3 border-2 border-neutral-400 lg:hover:scale-105 dark:border-neutral-600'
          />
          {!showMenu && (
            <div className='flex items-center gap-3'>
              <Link href='/' passHref>
                <h2 className='grow text-lg font-medium lg:text-xl'>
                  {site.profileName}
                </h2>
              </Link>
            </div>
          )}
        </div>

        <div className='flex items-center justify-between gap-5'>
          {showMenu && (
            <div className='flex items-center gap-6' data-aos='flip-up'>
              {menus.map((menu, index) => (
                <Link
                  key={index}
                  href={menu.href}
                  passHref
                  className={clsx(
                    'text-neutral-700 hover:text-neutral-800 dark:text-neutral-400 hover:dark:text-neutral-100',
                    router.pathname === menu?.href &&
                      'text-neutral-800! dark:text-neutral-100!',
                  )}
                >
                  <div>{menu.title}</div>
                </Link>
              ))}
            </div>
          )}

          {!showMenu && (
            <>
              <SearchBox />
              <ThemeSwitcher compact />
            </>
          )}

          <button
            className='flex items-center gap-2 rounded-md border p-2 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900'
            onClick={() => setShowMenu(!showMenu)}
          >
            {showMenu ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>
      <div className='block lg:hidden'>
        <Profile />
      </div>
    </header>
  );
};

export default HeaderTop;
