import Document, {
  type DocumentContext,
  type DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';

type AppDocumentProps = DocumentInitialProps & {
  lang: string;
};

const HTML_LANG_BY_LOCALE: Record<string, string> = {
  'zh-TW': 'zh-Hant',
  'zh-CN': 'zh-Hans',
  en: 'en',
};

export default function AppDocument({ lang }: AppDocumentProps) {
  return (
    <Html lang={lang} data-scroll-behavior='smooth'>
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

AppDocument.getInitialProps = async (
  ctx: DocumentContext,
): Promise<AppDocumentProps> => {
  const initialProps = await Document.getInitialProps(ctx);
  const locale = ctx.locale || ctx.defaultLocale || 'zh-TW';

  return {
    ...initialProps,
    lang: HTML_LANG_BY_LOCALE[locale] || 'zh-Hant',
  };
};
