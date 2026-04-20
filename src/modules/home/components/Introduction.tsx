import { useSiteConfig } from '@/common/config/site';

const Introduction = () => {
  const site = useSiteConfig();

  return (
    <section className='bg-cover bg-no-repeat '>
      <div className='space-y-3'>
        <div className='flex gap-2  text-2xl font-medium lg:text-3xl'>
          <h1>{site.profileGreeting}</h1>
        </div>
        {site.profileFacts.length > 0 && (
          <div className='space-y-4'>
            <ul className='ml-5 flex list-disc flex-col gap-1 text-neutral-700 dark:text-neutral-400 lg:flex-row lg:gap-10'>
              {site.profileFacts.map((fact: string) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className='mt-6 leading-[1.8] text-neutral-800 dark:text-neutral-300 md:leading-loose'>
        {site.profileBio}
      </p>
    </section>
  );
};

export default Introduction;
