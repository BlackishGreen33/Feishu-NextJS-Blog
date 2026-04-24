import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

type AosModule = {
  init: (options: { delay: number; duration: number }) => void;
  refreshHard: () => void;
};

const AosRuntime = () => {
  const router = useRouter();
  const aosRef = useRef<AosModule | null>(null);

  useEffect(() => {
    const syncAos = async () => {
      if (typeof document === 'undefined') {
        return;
      }

      const hasAosTarget = Boolean(document.querySelector('[data-aos]'));

      if (!hasAosTarget) {
        return;
      }

      if (!aosRef.current) {
        const aosImport = await import('aos');
        const aosModule = (
          'default' in aosImport ? aosImport.default : aosImport
        ) as AosModule;

        aosModule.init({
          delay: 50,
          duration: 800,
        });

        aosRef.current = aosModule;
        return;
      }

      aosRef.current.refreshHard();
    };

    const handleRouteChange = () => {
      window.requestAnimationFrame(() => {
        void syncAos();
      });
    };

    handleRouteChange();
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return null;
};

export default AosRuntime;
