import { useEffect, useState } from 'react';

const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    // SSR and first hydration must use the same placeholder before browser-only UI mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  return hasMounted;
};

export default useHasMounted;
