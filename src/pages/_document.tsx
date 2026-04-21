import Document, {
  type DocumentContext,
  type DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';

import {
  firaCode,
  jakartaSans,
  onestSans,
  soraSans,
} from '@/common/styles/fonts';

type MyDocumentProps = DocumentInitialProps & {
  locale: string;
};

const HTML_LANG_BY_LOCALE: Record<string, string> = {
  'zh-TW': 'zh-Hant',
  'zh-CN': 'zh-Hans',
  en: 'en',
};

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<MyDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);

    return {
      ...initialProps,
      locale: ctx.locale ?? ctx.defaultLocale ?? 'zh-TW',
    };
  }

  render() {
    return (
      <Html
        lang={HTML_LANG_BY_LOCALE[this.props.locale] ?? 'zh-Hant'}
        data-scroll-behavior='smooth'
        className={[
          jakartaSans.variable,
          soraSans.variable,
          firaCode.variable,
          onestSans.variable,
        ].join(' ')}
      >
        <Head>
          <link
            rel='apple-touch-icon'
            sizes='180x180'
            href='/favicon/apple-touch-icon.png'
          />
          <link
            rel='icon'
            type='image/png'
            sizes='32x32'
            href='/favicon/favicon-32x32.png'
          />
          <link
            rel='icon'
            type='image/png'
            sizes='16x16'
            href='/favicon/favicon-16x16.png'
          />
          <link rel='manifest' href='/favicon/site.webmanifest' />
          <link
            rel='mask-icon'
            href='/favicon/safari-pinned-tab.svg'
            color='#121212'
          />
          <meta name='theme-color' content='#121212' />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
