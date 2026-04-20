import { SITE_GITHUB_URL, useSiteConfig } from '@/common/config/site';

const Copyright = () => {
  const site = useSiteConfig();

  return (
    <div className='flex items-center gap-1 px-3 py-1 text-sm text-neutral-600 dark:text-neutral-600'>
      <span>©</span>
      <span>{new Date().getFullYear()}</span>
      <span>由</span>
      <span className='animate-pulse text-red-500'>❤</span>
      <span>製作</span>
      <a href={SITE_GITHUB_URL} target='_blank' rel='noopener noreferrer'>
        <span className='cursor-pointer hover:dark:text-neutral-400'>
          {site.profileName}
        </span>
      </a>
    </div>
  );
};

export default Copyright;
