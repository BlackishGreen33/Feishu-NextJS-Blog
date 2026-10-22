import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const useLoading = () => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Readiness is an external Router signal; preserve the loading latch after the first ready event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    router.isReady && setIsLoading(false);
  }, [router.isReady]);

  return isLoading;
};

export default useLoading;
