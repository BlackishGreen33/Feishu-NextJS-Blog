import { useRouter } from 'next/router';

import { DEFAULT_LOCALE, LOCALES, MESSAGES } from './messages';
import type { AppLocale, Messages } from './messages/base';

const isAppLocale = (value?: string): value is AppLocale =>
  Boolean(value && LOCALES.includes(value as AppLocale));

export const normalizeLocale = (value?: string): AppLocale =>
  isAppLocale(value) ? value : DEFAULT_LOCALE;

export const getMessages = (locale?: string): Messages =>
  MESSAGES[normalizeLocale(locale)];

export const useI18n = () => {
  const router = useRouter();
  const locale = normalizeLocale(router.locale);

  return {
    locale,
    defaultLocale: DEFAULT_LOCALE,
    locales: LOCALES,
    messages: getMessages(locale),
  };
};

export type { AppLocale, Messages };
