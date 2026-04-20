import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { FiMenu as MenuIcon } from 'react-icons/fi';
import { MdClose as CloseIcon } from 'react-icons/md';

import { SITE_PROFILE_IMAGE, SITE_PROFILE_NAME } from '@/common/config/site';
import { MENU_ITEMS } from '@/common/constant/menu';

import Image from '../../elements/Image';
import SearchBox from '../../elements/SearchBox';
import ThemeToggleButton from '../../elements/ThemeToggleButton';
import Profile from '../../sidebar/Profile';

const HeaderTop = () => {
  const [showMenu, setShowMenu] = useState(false);

  const router = useRouter();

  const menus = MENU_ITEMS.filter(
    (item) => item.isShow && item.title !== 'Home',
  );

  return (
    <header>
      <div className='mx-8 hidden items-center justify-between gap-5 py-8 lg:flex'>
        <div className='flex items-center gap-5'>
          <Image
            src={SITE_PROFILE_IMAGE}
            alt={SITE_PROFILE_NAME}
            width={40}
            height={40}
            priority
            rounded='rounded-full'
            className='rotate-3 border-2 border-neutral-400 dark:border-neutral-600 lg:hover:scale-105'
          />
          {!showMenu && (
            <div className='flex items-center gap-3'>
              <Link href='/' passHref>
                <h2 className='flex-grow  text-lg font-medium lg:text-xl'>
                  {SITE_PROFILE_NAME}
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
                      '!text-neutral-800 dark:!text-neutral-100',
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
              <ThemeToggleButton />
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
