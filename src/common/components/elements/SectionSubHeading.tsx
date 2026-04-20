import { ReactNode } from 'react';

interface SectionSubHeadingProps {
  children?: ReactNode;
}

const SectionSubHeading = ({ children }: SectionSubHeadingProps) => {
  return (
    <div className='flex flex-col justify-between gap-2 text-neutral-600 lg:flex-row lg:items-center dark:text-neutral-400'>
      {children}
    </div>
  );
};

export default SectionSubHeading;
