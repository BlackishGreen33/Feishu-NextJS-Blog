import { FC, useEffect, useRef } from 'react';
import Router from 'next/router';

type NProgressInstance = {
  configure: (options: {
    easing: string;
    minimum: number;
    showSpinner: boolean;
    speed: number;
  }) => void;
  done: () => void;
  start: () => void;
};

const getNProgressLoader = () =>
  import('nprogress').then((module) => {
    const nProgress = (
      'default' in module ? module.default : module
    ) as NProgressInstance;

    nProgress.configure({
      easing: 'ease',
      minimum: 0.3,
      showSpinner: false,
      speed: 500,
    });

    return nProgress;
  });

const ProgressBar: FC = () => {
  const nProgressPromiseRef = useRef<Promise<NProgressInstance> | null>(null);

  useEffect(() => {
    const loadNProgress = async () => {
      if (!nProgressPromiseRef.current) {
        nProgressPromiseRef.current = getNProgressLoader();
      }

      return nProgressPromiseRef.current;
    };

    const handleStart = () => {
      void loadNProgress().then((nProgress) => {
        nProgress.start();
      });
    };

    const handleDone = () => {
      void loadNProgress().then((nProgress) => {
        nProgress.done();
      });
    };

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleDone);
    Router.events.on('routeChangeError', handleDone);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleDone);
      Router.events.off('routeChangeError', handleDone);
    };
  }, []);

  return null;
};

export default ProgressBar;
