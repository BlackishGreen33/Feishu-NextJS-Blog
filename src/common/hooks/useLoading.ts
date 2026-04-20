import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const useLoading = () => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    router.isReady && setIsLoading(false);
  }, [router.isReady]);

  return isLoading;
};

export default useLoading;
