import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';

import 'aos/dist/aos.css';
import '@/common/styles/globals.css';

import ProgressBar from '@/common/components/elements/ProgressBar';
import Layout from '@/common/components/layouts';
import AosRuntime from '@/common/components/runtime/AosRuntime';
import { getDefaultSeo } from '@/common/config/seo';
import { CommandPaletteProvider } from '@/common/context/CommandPaletteContext';

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();

  const defaultSeo = getDefaultSeo(router.locale, router.asPath);

  return (
    <>
      <DefaultSeo {...defaultSeo} />
      <ThemeProvider attribute='class' defaultTheme='dark'>
        <CommandPaletteProvider>
          <Layout>
            <AosRuntime />
            <ProgressBar />
            <Component {...pageProps} />
          </Layout>
        </CommandPaletteProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
