import { format, parseISO } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

import { normalizeLocale } from '@/i18n';

import { ChapterGroupProps, MdxFileContentProps } from '../types/learn';

interface ParsedUrlProps {
  parentSlug: string;
  contentSlug: string;
}

export const formatBlogSlug = (slug: string) => slug?.slice(0, -5);

const DATE_FORMATS = {
  'zh-TW': 'yyyy 年 MM 月 dd 日',
  'zh-CN': 'yyyy 年 MM 月 dd 日',
  en: 'MMM d, yyyy',
} as const;

const MONTH_YEAR_FORMATS = {
  'zh-TW': 'yyyy 年 MM 月',
  'zh-CN': 'yyyy 年 MM 月',
  en: 'MMM yyyy',
} as const;

export const getDateFnsLocale = (locale?: string) => {
  const normalizedLocale = normalizeLocale(locale);

  return {
    'zh-TW': zhTW,
    'zh-CN': zhCN,
    en: enUS,
  }[normalizedLocale];
};

export const formatDate = (
  date: string,
  type?: string,
  locale?: string,
) => {
  if (!date) {
    return '';
  }

  const normalizedLocale = normalizeLocale(locale);
  const formattedDate = format(
    toZonedTime(parseISO(date), 'Asia/Shanghai'),
    type || DATE_FORMATS[normalizedLocale],
    { locale: getDateFnsLocale(normalizedLocale) },
  );
  return formattedDate;
};

export const formatMonthYear = (date: string, locale?: string) => {
  if (!date) {
    return '';
  }

  const normalizedLocale = normalizeLocale(locale);

  return format(new Date(date), MONTH_YEAR_FORMATS[normalizedLocale], {
    locale: getDateFnsLocale(normalizedLocale),
  });
};

export const groupContentByChapter = (
  contents: MdxFileContentProps[],
): Record<string, ChapterGroupProps> => {
  return contents.reduce(
    (acc, content) => {
      const { frontMatter } = content;

      const chapter_id = frontMatter.chapter_id ?? 0;
      const chapter_title = frontMatter.chapter_title || 'ungrouped';

      if (!acc[chapter_id]) {
        acc[chapter_id] = {
          chapter_id,
          chapter_title,
          contents: [],
        };
      }

      acc[chapter_id].contents.push(content);

      return acc;
    },
    {} as Record<string, ChapterGroupProps>,
  );
};

export const parseUrl = (url: string): ParsedUrlProps => {
  const parts = url.split('/');
  return {
    parentSlug: parts[2],
    contentSlug: parts[3],
  };
};

export const removeHtmlTags = (html: string) => {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } else {
    return html;
  }
};

export const formatExcerpt = (content: string, maxLength = 100) => {
  const cleanedContent = removeHtmlTags(content);

  if (cleanedContent.length <= maxLength) {
    return cleanedContent;
  }

  const trimmed = cleanedContent.substring(0, maxLength).replace(/\s+\S*$/, '');

  return trimmed + (cleanedContent.length > maxLength ? '...' : '');
};

export const calculateReadingTime = (content: string, wordsPerMinute = 220) => {
  const cleanedContent = removeHtmlTags(content);
  const totalWords = cleanedContent.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.ceil(totalWords / wordsPerMinute);
  return Math.max(1, readingTimeMinutes);
};
