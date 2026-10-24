import { SITE_DEFAULT_BLOG_COVER } from '@/common/config/site';
import { articleFrontmatterSchema } from '@/common/schemas/blog';
import {
  Article,
  ArticleFrontmatter,
  ArticleSlugRedirect,
  ArticleSummary,
  ArticleTag,
} from '@/common/types/blog';

import { ArticleAssetManager } from './assets';
import { SourceAsset, SourceDocument, SourceDocumentRevision } from './source';
import { BlogSyncDocumentState } from './sync-state';
import {
  calculateReadingTime,
  ensureUniqueSlug,
  extractLinkedTokens,
  isHiddenTitle,
  replaceTokens,
  summarizeMarkdown,
  toBoolean,
  toIsoDate,
  toSlug,
  toStringArray,
} from './utils';

export type RawArticle = {
  document: SourceDocumentRevision;
  title: string;
  fileTokens: Record<string, SourceAsset>;
  frontmatter: ArticleFrontmatter;
  content: string;
  documentCoverToken: string | undefined;
  documentCoverUrl?: string;
};

export type DocumentMetadata = {
  document: SourceDocumentRevision;
  previousSlug: string | undefined;
  previousState: BlogSyncDocumentState | undefined;
  previousArticle: Article | null | undefined;
  revisionId: string | undefined;
  objEditTime: string | undefined;
  coverToken: string | undefined;
  shouldRefresh: boolean;
  inspectionFailed?: boolean;
};

export const ARTICLE_CONTENT_VERSION = 2;

export const hasSameDocumentVersion = (
  previous: BlogSyncDocumentState | undefined,
  current: Pick<SourceDocumentRevision, 'coverToken' | 'revisionId'> & {
    sourceDocumentId: string;
    updatedAt?: string;
  },
) => {
  if (!previous || previous.sourceDocumentId !== current.sourceDocumentId) {
    return false;
  }

  if (previous.contentVersion !== ARTICLE_CONTENT_VERSION) {
    return false;
  }

  if ((previous.coverToken || '') !== (current.coverToken || '')) {
    return false;
  }

  if (current.revisionId) {
    return previous.revisionId === current.revisionId;
  }

  if (current.updatedAt) {
    return previous.objEditTime === current.updatedAt;
  }

  return false;
};

const buildTagList = (input: ArticleFrontmatter['tags']): ArticleTag[] =>
  toStringArray(input).map((name) => ({
    name,
    slug: toSlug(name),
  }));

const normalizeFrontmatterDate = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  return value instanceof Date ? value.toISOString() : undefined;
};

export const normalizeFrontmatter = (value: Record<string, unknown>) =>
  articleFrontmatterSchema.parse({
    slug: typeof value.slug === 'string' ? value.slug : undefined,
    title: typeof value.title === 'string' ? value.title : undefined,
    date: normalizeFrontmatterDate(value.date),
    tags: toStringArray(value.tags),
    summary: typeof value.summary === 'string' ? value.summary : undefined,
    cover: typeof value.cover === 'string' ? value.cover : undefined,
    featured: toBoolean(value.featured),
    draft: toBoolean(value.draft),
    hide: toBoolean(value.hide),
  });

const resolveArticleDates = (
  frontmatterDate: string | undefined,
  document: Pick<SourceDocument, 'createdAt' | 'updatedAt'>,
) => ({
  publishedAt: toIsoDate(
    frontmatterDate || document.createdAt || document.updatedAt || undefined,
  ),
  updatedAt: toIsoDate(
    document.updatedAt || frontmatterDate || document.createdAt || undefined,
  ),
});

export const parseArticle = (raw: RawArticle, slug: string): Article => {
  const tags = buildTagList(raw.frontmatter.tags);
  const title = raw.frontmatter.title || raw.title;
  const summary = raw.frontmatter.summary || summarizeMarkdown(raw.content);
  const { publishedAt, updatedAt } = resolveArticleDates(
    raw.frontmatter.date,
    raw.document,
  );
  const draft =
    raw.frontmatter.draft ||
    raw.frontmatter.hide ||
    isHiddenTitle(raw.document.title || '');
  const cover = raw.documentCoverUrl || SITE_DEFAULT_BLOG_COVER;

  return {
    id: raw.document.sourceNodeToken,
    slug,
    title,
    summary,
    cover,
    publishedAt,
    updatedAt,
    tags,
    featured: raw.frontmatter.featured || false,
    draft,
    readingTimeMinutes: calculateReadingTime(raw.content),
    sourceNodeToken: raw.document.sourceNodeToken,
    sourceDocumentId: raw.document.sourceDocumentId,
    content: raw.content,
    contentFormat: 'markdown',
  };
};

export const buildSlugMap = (
  documents: DocumentMetadata[],
  rawArticlesByNodeToken: Map<string, RawArticle>,
  reservedAliases: Set<string>,
) => {
  const slugs = new Set([
    ...reservedAliases,
    ...documents.flatMap((document) =>
      document.previousSlug ? [document.previousSlug] : [],
    ),
  ]);
  const mapping = new Map<string, string>();

  documents.forEach((document) => {
    const rawArticle = rawArticlesByNodeToken.get(
      document.document.sourceNodeToken,
    );
    const preferredSlug = rawArticle
      ? toSlug(
          rawArticle.frontmatter.slug ||
            rawArticle.frontmatter.title ||
            rawArticle.title,
        )
      : document.previousSlug || toSlug(document.document.title);

    if (
      document.previousSlug === preferredSlug &&
      !reservedAliases.has(preferredSlug)
    ) {
      slugs.delete(preferredSlug);
    }

    const slug = ensureUniqueSlug(
      preferredSlug,
      document.document.sourceNodeToken.slice(-6),
      slugs,
    );
    mapping.set(document.document.sourceNodeToken, slug);
  });

  return mapping;
};

export const buildArticleRedirects = (
  previousRedirects: Record<string, ArticleSlugRedirect>,
  slugChanges: Record<string, ArticleSlugRedirect>,
  articles: ArticleSummary[],
) => {
  const activeSlugByNodeToken = new Map(
    articles.map((article) => [article.sourceNodeToken, article.slug]),
  );

  return Object.entries({ ...previousRedirects, ...slugChanges }).reduce<
    Record<string, ArticleSlugRedirect>
  >((acc, [from, redirect]) => {
    const targetSlug = activeSlugByNodeToken.get(redirect.sourceNodeToken);

    acc[from] = targetSlug ? { ...redirect, targetSlug } : redirect;

    return acc;
  }, {});
};

export const rewriteArticleContent = async (
  assetManager: ArticleAssetManager,
  rawArticle: RawArticle,
  nodeTokenToSlug: Map<string, string>,
) => {
  const internalLinks = extractLinkedTokens(rawArticle.content).reduce<
    Record<string, string>
  >((acc, token) => {
    const slug = nodeTokenToSlug.get(token);
    if (slug) {
      acc[token] = `/blog/${slug}`;
    }
    return acc;
  }, {});

  const assets = await assetManager.resolveArticleAssets(rawArticle.fileTokens);
  const assetTokens = new Set(Object.keys(assets));
  const content = replaceTokens(rawArticle.content, {
    ...internalLinks,
    ...assets,
  });
  let cover: string | undefined;

  if (rawArticle.documentCoverToken) {
    cover = await assetManager.resolveCover(
      rawArticle.documentCoverToken,
      assets,
    );
    assetTokens.add(rawArticle.documentCoverToken);
  }

  return {
    content,
    cover,
    assetTokens: [...assetTokens],
  };
};
