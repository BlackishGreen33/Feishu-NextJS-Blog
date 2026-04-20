import { getMessages, normalizeLocale } from '@/i18n';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/messages';
import type { AppLocale } from '@/i18n/messages/base';

import { SITE_PROFILE_HANDLE, SITE_PROFILE_IMAGE, SITE_URL } from './site';

const OG_LOCALE: Record<AppLocale, string> = {
  'zh-TW': 'zh_TW',
  'zh-CN': 'zh_CN',
  en: 'en_US',
};

const normalizePath = (path = '/') => {
  const [withoutHash] = path.split('#');
  const [withoutQuery] = withoutHash.split('?');

  if (!withoutQuery || withoutQuery === '') {
    return '/';
  }

  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (withoutQuery === prefix) {
      return '/';
    }
    if (withoutQuery.startsWith(`${prefix}/`)) {
      return withoutQuery.slice(prefix.length);
    }
  }

  return withoutQuery;
};

export const getLocalePath = (path = '/', locale?: string) => {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedPath = normalizePath(path);

  if (normalizedLocale === DEFAULT_LOCALE) {
    return normalizedPath;
  }

  return normalizedPath === '/'
    ? `/${normalizedLocale}`
    : `/${normalizedLocale}${normalizedPath}`;
};

export const getCanonicalUrl = (path = '/', locale?: string) =>
  `${SITE_URL}${getLocalePath(path, locale)}`;

export const getLanguageAlternates = (path = '/') =>
  LOCALES.map((locale) => ({
    hrefLang: locale,
    href: getCanonicalUrl(path, locale),
  }));

export const getDefaultSeo = (locale?: string, path = '/') => {
  const normalizedLocale = normalizeLocale(locale);
  const messages = getMessages(normalizedLocale);
  const canonical = getCanonicalUrl(path, normalizedLocale);

  return {
    defaultTitle: messages.site.title,
    description: messages.site.description,
    canonical,
    languageAlternates: getLanguageAlternates(path),
    openGraph: {
      canonical,
      title: messages.site.title,
      description: messages.site.description,
      type: 'website',
      locale: OG_LOCALE[normalizedLocale],
      images: [
        {
          url: SITE_PROFILE_IMAGE,
          alt: messages.site.name,
          width: 800,
          height: 600,
        },
        {
          url: SITE_PROFILE_IMAGE,
          alt: messages.site.name,
          width: 1200,
          height: 630,
        },
      ],
      site_name: messages.site.name,
    },
    twitter: {
      handle: SITE_PROFILE_HANDLE,
      site: SITE_PROFILE_HANDLE,
      cardType: 'summary_large_image',
    },
  };
};
