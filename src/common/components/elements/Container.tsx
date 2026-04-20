import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  [propName: string]: ReactNode | string | undefined;
}

const Container = ({ children, className = '', ...others }: ContainerProps) => {
  return (
    <div className={`mt-20 mb-10 p-8 lg:mt-0 ${className} `} {...others}>
      {children}
    </div>
  );
};

export default Container;
