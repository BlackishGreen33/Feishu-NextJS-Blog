import { useEffect, useState } from 'react';
import { useWindowSize } from 'usehooks-ts';

const useIsMobile = () => {
  const { width } = useWindowSize();
  const [isMobile, setIsMobile] = useState(width < 769);

  useEffect(() => {
    // Preserve the initial 769px state, then synchronize the external viewport using the existing 821px breakpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(width < 821);
  }, [width]);

  return isMobile;
};

export default useIsMobile;
