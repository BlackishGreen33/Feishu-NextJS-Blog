import Router from 'next/router';
import { BiRocket as RocketIcon } from 'react-icons/bi';

import Button from '@/common/components/elements/Button';
import Card from '@/common/components/elements/Card';
import SectionHeading from '@/common/components/elements/SectionHeading';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';

const Services = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();

  return (
    <section className='space-y-5'>
      <div className='space-y-3'>
        <SectionHeading title={site.homeServicesTitle} />
        <p className='leading-[1.8] text-neutral-800 md:leading-loose dark:text-neutral-300'>
          {site.homeServicesDescription}
        </p>
      </div>
      <Card className='space-y-4 rounded-xl border bg-neutral-100 p-8 dark:border-none dark:bg-[#1e1e1e]'>
        <div className='flex items-center gap-2'>
          <RocketIcon size={24} />
          <h3 className='text-xl font-medium'>{site.homeServicesCardTitle}</h3>
        </div>
        <p className='pl-2 leading-[1.8] text-neutral-800 md:leading-loose dark:text-neutral-300'>
          {site.homeServicesCardDescription}
        </p>
        <Button
          data-umami-event='Click Contact Button'
          onClick={() => Router.push('/contact')}
        >
          {messages.home.contactButton}
        </Button>
      </Card>
    </section>
  );
};

export default Services;
