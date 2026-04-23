import { getSiteConfig, SITE_URL } from '@/common/config/site';
import { getMessages, normalizeLocale } from '@/i18n';
import { type AppLocale } from '@/i18n/messages/base';
import {
  getArticleBySlug,
  getLatestArticles,
  listArticles,
} from '@/server/blog/repository';
import { summarizeMarkdown } from '@/server/blog/utils';

type ChatContextInput = {
  currentPath?: string;
  locale?: string;
  prompt: string;
};

const MAX_CURRENT_ARTICLE_CHARS = 1200;
const RELATED_ARTICLE_LIMIT = 3;
const LATEST_ARTICLE_LIMIT = 3;

const normalizePath = (value = '/') => {
  const [withoutHash] = value.split('#');
  const [withoutQuery] = withoutHash.split('?');

  if (!withoutQuery || withoutQuery === '') {
    return '/';
  }

  return withoutQuery;
};

const stripLocalePrefix = (path: string, locale: AppLocale) => {
  if (path === `/${locale}`) {
    return '/';
  }

  return path.startsWith(`/${locale}/`) ? path.slice(locale.length + 1) : path;
};

const getStaticPageContext = (path: string, locale: AppLocale) => {
  const messages = getMessages(locale);
  const site = getSiteConfig(locale);

  const mapping: Record<string, { title: string; description: string }> = {
    '/': {
      title: messages.nav.home,
      description: site.description,
    },
    '/about': {
      title: messages.pages.aboutTitle,
      description: site.aboutPageDescription,
    },
    '/contact': {
      title: messages.pages.contactTitle,
      description: site.contactPageDescription,
    },
    '/blog': {
      title: messages.pages.blogTitle,
      description: messages.blog.latestArticles,
    },
    '/dashboard': {
      title: messages.pages.dashboardTitle,
      description: messages.dashboard.pageDescription,
    },
    '/guestbook': {
      title: messages.pages.guestbookTitle,
      description: messages.pages.guestbookDescription,
    },
    '/learn': {
      title: messages.pages.learnTitle,
      description: messages.pages.learnDescription,
    },
    '/projects': {
      title: messages.pages.projectsTitle,
      description: messages.pages.projectsDescription,
    },
    '/playground': {
      title: messages.pages.playgroundTitle,
      description: messages.site.navGroupLabels.apps,
    },
  };

  return mapping[path] || null;
};

const getRelevantArticles = async (prompt: string) => {
  const directMatches = await listArticles({
    search: prompt,
    perPage: RELATED_ARTICLE_LIMIT,
  });

  if (directMatches.posts.length > 0) {
    return directMatches.posts;
  }

  return getLatestArticles(LATEST_ARTICLE_LIMIT);
};

const toArticleContextLine = ({
  title,
  slug,
  summary,
  tags,
  publishedAt,
}: {
  title: string;
  slug: string;
  summary: string;
  tags: Array<{ name: string }>;
  publishedAt: string;
}) =>
  [
    `- ${title}`,
    `path: /blog/${slug}`,
    `publishedAt: ${publishedAt}`,
    `tags: ${tags.map((tag) => tag.name).join(', ') || 'none'}`,
    `summary: ${summary}`,
  ].join(' | ');

export const buildSiteChatContext = async ({
  currentPath,
  locale,
  prompt,
}: ChatContextInput) => {
  const normalizedLocale = normalizeLocale(locale);
  const messages = getMessages(normalizedLocale);
  const site = getSiteConfig(normalizedLocale);
  const normalizedPath = stripLocalePrefix(
    normalizePath(currentPath || '/'),
    normalizedLocale,
  );
  const currentPage = getStaticPageContext(normalizedPath, normalizedLocale);
  const relevantArticles = await getRelevantArticles(prompt);

  const contextSections = [
    `Site URL: ${SITE_URL}`,
    `Site name: ${site.name}`,
    `Site title: ${site.title}`,
    `Site description: ${site.description}`,
    `Locale: ${normalizedLocale}`,
    `Available top-level pages: /, /dashboard, /projects, /blog, /learn, /about, /contact, /guestbook, /playground`,
  ];

  if (currentPage) {
    contextSections.push(
      `Current page path: ${normalizedPath}`,
      `Current page title: ${currentPage.title}`,
      `Current page description: ${currentPage.description}`,
    );
  } else {
    contextSections.push(`Current page path: ${normalizedPath}`);
  }

  if (normalizedPath.startsWith('/blog/')) {
    const slug = normalizedPath.slice('/blog/'.length);
    const currentArticle = await getArticleBySlug(slug);

    if (currentArticle) {
      contextSections.push(
        `Current article title: ${currentArticle.title}`,
        `Current article summary: ${currentArticle.summary}`,
        `Current article tags: ${
          currentArticle.tags.map((tag) => tag.name).join(', ') || 'none'
        }`,
        `Current article content excerpt: ${summarizeMarkdown(
          currentArticle.content,
          MAX_CURRENT_ARTICLE_CHARS,
        )}`,
      );
    }
  }

  if (relevantArticles.length > 0) {
    contextSections.push(
      'Relevant site articles:',
      ...relevantArticles.map(toArticleContextLine),
    );
  }

  contextSections.push(
    'Answering rules:',
    `- Reply in ${messages.locale.options[normalizedLocale].label} unless the user clearly asks for another language.`,
    '- When referring to site content, prefer the context above.',
    '- If the context does not support a claim, say you do not know.',
    '- When helpful, mention relevant page paths such as /about or /blog.',
  );

  return contextSections.join('\n');
};
