import type { AppLocale, Messages } from './base';
import enMessages from './en';
import zhCNMessages from './zh-CN';
import zhTWMessages from './zh-TW';

export const LOCALES: AppLocale[] = ['zh-TW', 'zh-CN', 'en'];
export const DEFAULT_LOCALE: AppLocale = 'zh-TW';

export const MESSAGES: Record<AppLocale, Messages> = {
  'zh-TW': zhTWMessages,
  'zh-CN': zhCNMessages,
  en: enMessages,
};
