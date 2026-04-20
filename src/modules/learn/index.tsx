import { motion } from 'framer-motion';

import EmptyState from '@/common/components/elements/EmptyState';
import { ContentProps } from '@/common/types/learn';
import { useI18n } from '@/i18n';

import LearnCard from './components/LearnCard';

interface LearnModuleProps {
  contents: ContentProps[];
}

const LearnModule = ({ contents }: LearnModuleProps) => {
  const { messages } = useI18n();

  if (contents.length === 0) {
    return <EmptyState message={messages.learn.empty} />;
  }

  return (
    <div className='grid gap-5 pt-2 sm:grid-cols-2'>
      {contents?.map((content, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <LearnCard {...content} />
        </motion.div>
      ))}
    </div>
  );
};

export default LearnModule;
