import { ReactNode } from 'react';
import styled from '@emotion/styled';

interface InfiniteLoopSliderProps {
  children: ReactNode;
  isReverse?: boolean;
}

const InfiniteLoopSlider = ({
  children,
  isReverse = false,
}: InfiniteLoopSliderProps) => {
  return (
    <StyledSlider
      className='animate-looping-tag flex w-fit'
      isReverse={isReverse}
    >
      {children}
    </StyledSlider>
  );
};

export default InfiniteLoopSlider;

const StyledSlider = styled.div<{ isReverse: boolean }>`
  animation-direction: ${({ isReverse }) => (isReverse ? 'reverse' : 'normal')};
`;
