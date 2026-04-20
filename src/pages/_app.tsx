import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import AOS from 'aos';

import 'aos/dist/aos.css';
import '@/common/styles/globals.css';

import CommandPalette from '@/common/components/elements/CommandPalette';
import Layout from '@/common/components/layouts';
import { getDefaultSeo } from '@/common/config/seo';
import { CommandPaletteProvider } from '@/common/context/CommandPaletteContext';
import {
  firaCode,
  jakartaSans,
  onestSans,
  soraSans,
} from '@/common/styles/fonts';

const ProgressBar = dynamic(
  () => import('src/common/components/elements/ProgressBar'),
  { ssr: false },
);

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();

  useEffect(() => {
    AOS.init({
      duration: 800,
      delay: 50,
    });
  }, []);

  const defaultSeo = getDefaultSeo(router.locale, router.asPath);

  return (
    <>
      <style jsx global>
        {`
          html {
            --jakartaSans-font: ${jakartaSans.style.fontFamily};
            --soraSans-font: ${soraSans.style.fontFamily};
            --firaCode-font: ${firaCode.style.fontFamily};
            --onestSans-font: ${onestSans.style.fontFamily};
          }
        `}
      </style>
      <DefaultSeo {...defaultSeo} />
      <ThemeProvider attribute='class' defaultTheme='dark'>
        <CommandPaletteProvider>
          <Layout>
            <CommandPalette />
            <ProgressBar />
            <Component {...pageProps} />
          </Layout>
        </CommandPaletteProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
