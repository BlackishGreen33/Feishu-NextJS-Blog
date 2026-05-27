import {
  Article,
  ArticleSearchEntry,
  ArticleSearchIndex,
  ArticleSummary,
} from '@/common/types/blog';

import { sortArticlesByDate, stripMarkdown } from './utils';

const EXCERPT_LENGTH = 160;

export const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

const splitSearchTerms = (query: string) =>
  normalizeSearchText(query).split(' ').filter(Boolean);

const toArticleSummary = (article: Article): ArticleSummary => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  summary: article.summary,
  cover: article.cover,
  publishedAt: article.publishedAt,
  updatedAt: article.updatedAt,
  tags: article.tags,
  featured: article.featured,
  draft: article.draft,
  readingTimeMinutes: article.readingTimeMinutes,
  sourceNodeToken: article.sourceNodeToken,
  sourceDocumentId: article.sourceDocumentId,
});

export const buildArticleSearchEntry = (
  article: Article,
): ArticleSearchEntry => {
  const summary = toArticleSummary(article);
  const tagNames = article.tags.map((tag) => tag.name);
  const bodyText = stripMarkdown(article.content);
  const searchableText = normalizeSearchText(
    [article.title, article.summary, ...tagNames, bodyText].join(' '),
  );

  return {
    ...summary,
    tagNames,
    bodyText,
    searchableText,
  };
};

export const buildArticleSearchIndex = ({
  generatedAt,
  source,
  articles,
}: {
  generatedAt: string;
  source: ArticleSearchIndex['source'];
  articles: Article[];
}): ArticleSearchIndex => ({
  generatedAt,
  source,
  articles: sortArticlesByDate(articles).map(buildArticleSearchEntry),
});

const createExcerpt = (source: string, terms: string[]) => {
  const normalizedSource = source.toLowerCase();
  const matchedTerm = terms.find((term) => normalizedSource.includes(term));

  if (!matchedTerm) {
    return undefined;
  }

  const matchIndex = normalizedSource.indexOf(matchedTerm);
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(source.length, start + EXCERPT_LENGTH);
  const excerpt = source.slice(start, end).trim();

  return `${start > 0 ? '...' : ''}${excerpt}${end < source.length ? '...' : ''}`;
};

const scoreEntry = (entry: ArticleSearchEntry, terms: string[]) => {
  const title = normalizeSearchText(entry.title);
  const summary = normalizeSearchText(entry.summary);
  const tags = normalizeSearchText(entry.tagNames.join(' '));
  const body = normalizeSearchText(entry.bodyText);

  let score = 0;

  for (const term of terms) {
    const matched =
      title.includes(term) ||
      tags.includes(term) ||
      summary.includes(term) ||
      body.includes(term);

    if (!matched) {
      return null;
    }

    if (title.includes(term)) score += 80;
    if (tags.includes(term)) score += 50;
    if (summary.includes(term)) score += 30;
    if (body.includes(term)) score += 10;
  }

  return score;
};

const fallbackEntryFromSummary = (
  summary: ArticleSummary,
): ArticleSearchEntry => ({
  ...summary,
  tagNames: summary.tags.map((tag) => tag.name),
  bodyText: '',
  searchableText: normalizeSearchText(
    [
      summary.title,
      summary.summary,
      ...summary.tags.map((tag) => tag.name),
    ].join(' '),
  ),
});

export const searchArticleSummaries = ({
  articles,
  searchIndex,
  query,
  tag,
  featured,
}: {
  articles: ArticleSummary[];
  searchIndex: ArticleSearchIndex | null;
  query: string;
  tag?: string;
  featured?: boolean;
}) => {
  const terms = splitSearchTerms(query);

  if (terms.length === 0) {
    return articles;
  }

  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  const entriesBySlug = new Map(
    (searchIndex?.articles || []).map((entry) => [entry.slug, entry]),
  );
  const entries = articles.map(
    (article) =>
      entriesBySlug.get(article.slug) || fallbackEntryFromSummary(article),
  );
  const normalizedTag = tag?.trim().toLowerCase();

  return entries
    .map((entry) => {
      const summary = bySlug.get(entry.slug);
      if (!summary) return null;
      if (featured && !summary.featured) return null;
      if (
        normalizedTag &&
        !summary.tags.some((item) => item.slug === normalizedTag)
      ) {
        return null;
      }

      const score = scoreEntry(entry, terms);
      if (score === null) return null;

      const matchedExcerpt =
        createExcerpt(entry.bodyText, terms) ||
        createExcerpt(summary.summary, terms);

      return {
        article: {
          ...summary,
          ...(matchedExcerpt ? { matchedExcerpt } : {}),
        },
        score,
      };
    })
    .filter(
      (
        result,
      ): result is {
        article: ArticleSummary;
        score: number;
      } => Boolean(result),
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        new Date(b.article.publishedAt).getTime() -
        new Date(a.article.publishedAt).getTime()
      );
    })
    .map((result) => result.article);
};
