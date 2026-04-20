import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import clsx from 'clsx';

import useHasMounted from '@/common/hooks/useHasMounted';

import HeaderSidebar from './header/HeaderSidebar';
import HeaderTop from './header/HeaderTop';

// import TopBar from '../elements/TopBar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { resolvedTheme } = useTheme();
  const hasMounted = useHasMounted();

  const isDarkTheme =
    hasMounted && (resolvedTheme === 'dark' || resolvedTheme === 'system');

  const router = useRouter();
  const pageName = router.pathname.split('/')[1];

  const isFullPageHeader =
    pageName === 'playground' ||
    pageName === 'blog' ||
    router.pathname.startsWith('/blog/') ||
    router.pathname.startsWith('/learn/');

  return (
    <>
      {/* <TopBar /> */}
      <div
        className={clsx(
          'mx-auto max-w-6xl',
          isDarkTheme ? 'dark:text-darkText' : '',
        )}
      >
        {isFullPageHeader ? (
          <div className='flex flex-col xl:pb-8'>
            <HeaderTop />
            <main className='transition-all duration-300'>{children}</main>
          </div>
        ) : (
          <div className='flex flex-col lg:flex-row lg:gap-2 lg:py-4 xl:pb-8'>
            <HeaderSidebar />
            <main className='max-w-[915px] transition-all duration-300 lg:w-4/5'>
              {children}
            </main>
          </div>
        )}
      </div>
    </>
  );
};

export default Layout;
