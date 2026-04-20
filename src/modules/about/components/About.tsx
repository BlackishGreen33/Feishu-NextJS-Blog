import {
  HiOutlineAcademicCap as EducationIcon,
  HiOutlineBookmark as AboutIcon,
  HiOutlineBriefcase as CareerIcon,
  HiOutlineDocumentText as ResumeIcon,
} from 'react-icons/hi';

import { Tabs } from '@/common/components/elements/Tabs';
import { useI18n } from '@/i18n';

import CareerList from './CareerList';
import EducationList from './EducationList';
import Resume from './Resume';
import Story from './Story';

const About = () => {
  const { messages } = useI18n();
  const TABS = [
    {
      label: (
        <TabLabel>
          <AboutIcon size={17} /> {messages.about.tabs.story}
        </TabLabel>
      ),
      children: <Story />,
    },
    {
      label: (
        <TabLabel>
          <ResumeIcon size={17} /> {messages.about.tabs.resume}
        </TabLabel>
      ),
      children: <Resume />,
    },
    {
      label: (
        <TabLabel>
          <CareerIcon size={17} /> {messages.about.tabs.career}
        </TabLabel>
      ),
      children: <CareerList />,
    },
    {
      label: (
        <TabLabel>
          <EducationIcon size={17} /> {messages.about.tabs.education}
        </TabLabel>
      ),
      children: <EducationList />,
    },
  ];
  return <Tabs tabs={TABS} />;
};

export default About;

const TabLabel = ({ children }: { children: React.ReactNode }) => (
  <div className='flex items-center justify-center gap-1.5'>{children}</div>
);
