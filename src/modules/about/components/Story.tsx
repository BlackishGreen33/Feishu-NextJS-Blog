import { getAboutHtml } from '@/common/constant/about';
import { useI18n } from '@/i18n';

const Story = () => {
  const { locale } = useI18n();

  return (
    <div className='space-y-4'>
      <section
        className='space-y-4 leading-[1.8] text-neutral-800 md:leading-loose dark:text-neutral-300'
        dangerouslySetInnerHTML={{ __html: getAboutHtml(locale) }}
      />
    </div>
  );
};

export default Story;
