import { getMessages } from '@/i18n';

export const getEducation = (locale?: string) =>
  getMessages(locale).about.education.items;
