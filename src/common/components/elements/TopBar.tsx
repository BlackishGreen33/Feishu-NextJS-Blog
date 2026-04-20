import { SITE_GITHUB_URL, useSiteConfig } from '@/common/config/site';

import Image from './Image';

const TopBar = () => {
  const site = useSiteConfig();

  return (
    <div className='hidden items-center justify-center gap-x-2 bg-cover bg-no-repeat p-2.5 text-sm shadow-lg backdrop-blur-2xl xl:flex dark:border-b dark:border-neutral-800 dark:text-neutral-300'>
      <span>🚀</span>
      <span>{site.profileName} 的個人網站正在整理中，內容會陸續補上：</span>
      <a
        href={SITE_GITHUB_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='ml-0.5 underline'
      >
        GitHub
      </a>
      <Image
        src='/images/dot_new_animated.svg'
        width={30}
        height={30}
        alt='new'
      />
    </div>
  );
};

export default TopBar;
