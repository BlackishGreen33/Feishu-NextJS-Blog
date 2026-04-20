import SectionHeading from '@/common/components/elements/SectionHeading';
import { useSiteConfig } from '@/common/config/site';
import Skills from '@/modules/about/components/Skills';

const SkillsSection = () => {
  const site = useSiteConfig();

  return (
    <section className='space-y-5'>
      <div className='space-y-3'>
        <SectionHeading title={site.homeSkillsTitle} />
      </div>
      <Skills />
    </section>
  );
};

export default SkillsSection;
