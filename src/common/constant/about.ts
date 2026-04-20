import { getMessages } from '@/i18n';

export const getAboutHtml = (locale?: string) =>
  getMessages(locale).about.storyHtml;
