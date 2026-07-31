/* eslint-disable no-console */
import matter from 'gray-matter';

import { SITE_DEFAULT_BLOG_COVER } from '@/common/config/site';
import {
  Article,
  ArticleFrontmatter,
  ArticleIndex,
  ArticleSummary,
  ArticleTag,
} from '@/common/types/blog';
import { getServerEnv } from '@/server/env';

import { ArticleAssetManager, createArticleAssetManager } from './assets';
import { buildArticleSearchIndex } from './search';
import {
  ArticleSourceAdapter,
  createFeishuArticleSource,
  SourceAsset,
  SourceDocument,
  SourceDocumentRevision,
} from './source';
import { BlogStorageAdapter, getBlogStorage } from './storage';
import { BlogSyncDocumentState, BlogSyncState } from './sync-state';
import {
  calculateReadingTime,
  ensureUniqueSlug,
  extractLinkedTokens,
  isHiddenTitle,
  mapWithConcurrency,
  replaceTokens,
  sortArticlesByDate,
  stripLeadingHeading,
  summarizeMarkdown,
  toBoolean,
  toIsoDate,
  toSlug,
  toStringArray,
} from './utils';

type SyncOptions = {
  optional?: boolean;
};

type SyncResult = {
  skipped?: boolean;
  reason?: string;
  storage: string;
  totalDocuments?: number;
  totalArticles?: number;
  reusedArticles?: number;
  changedArticles?: number;
  downloadedAssets?: number;
  reusedAssets?: number;
  fallbackArticles?: number;
  deletedAssets?: number;
  failedAssetDeletes?: number;
};

type RawArticle = {
  document: SourceDocumentRevision;
  title: string;
  fileTokens: Record<string, SourceAsset>;
  frontmatter: ArticleFrontmatter;
  content: string;
  documentCoverToken?: string;
  documentCoverUrl?: string;
};

type DocumentMetadata = {
  document: SourceDocumentRevision;
  previousState?: BlogSyncDocumentState;
  previousArticle?: Article | null;
  revisionId?: string;
  objEditTime?: string;
  coverToken?: string;
  shouldRefresh: boolean;
  inspectionFailed?: boolean;
};

const DOCUMENT_SYNC_CONCURRENCY = 3;

export type ArticleSyncPublicationAdapter = Pick<
  BlogStorageAdapter,
  | 'name'
  | 'readArticle'
  | 'writeArticle'
  | 'readSyncState'
  | 'writeSyncState'
  | 'assetExists'
  | 'writeAsset'
  | 'deleteAsset'
  | 'writeIndex'
  | 'writeSearchIndex'
>;

type ArticleSyncBindings =
  | {
      availability: 'missing-config';
      missingKeys: readonly string[];
      publication: ArticleSyncPublicationAdapter;
    }
  | {
      availability: 'ready';
      source: ArticleSourceAdapter;
      publication: ArticleSyncPublicationAdapter;
    };

type RunFeishuArticleSync = (options?: SyncOptions) => Promise<SyncResult>;

const normalizeSyncState = (state: BlogSyncState | null): BlogSyncState => ({
  generatedAt: state?.generatedAt || '',
  source: 'feishu',
  documents: state?.documents || {},
  assets: state?.assets || {},
});

const hasSameDocumentVersion = (
  previous: BlogSyncDocumentState | undefined,
  current: Pick<SourceDocumentRevision, 'coverToken' | 'revisionId'> & {
    sourceDocumentId: string;
    updatedAt?: string;
  },
) => {
  if (!previous || previous.sourceDocumentId !== current.sourceDocumentId) {
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

const normalizeFrontmatter = (value: Record<string, unknown>) => ({
  slug: typeof value.slug === 'string' ? value.slug : undefined,
  title: typeof value.title === 'string' ? value.title : undefined,
  date: normalizeFrontmatterDate(value.date),
  tags: value.tags as ArticleFrontmatter['tags'],
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

const parseArticle = (raw: RawArticle, slug: string): Article => {
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

const buildSlugMap = (
  documents: DocumentMetadata[],
  rawArticlesByNodeToken: Map<string, RawArticle>,
) => {
  const slugs = new Set<string>();
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
      : document.previousState?.slug || toSlug(document.document.title);
    const slug = ensureUniqueSlug(
      preferredSlug,
      document.document.sourceNodeToken.slice(-6),
      slugs,
    );
    mapping.set(document.document.sourceNodeToken, slug);
  });

  return mapping;
};

const rewriteArticleContent = async (
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

const runFeishuArticleSync = async (
  source: ArticleSourceAdapter,
  storage: ArticleSyncPublicationAdapter,
): Promise<SyncResult> => {
  const documents = await source.listDocuments();
  const previousSyncState = normalizeSyncState(await storage.readSyncState());
  const assetManager = createArticleAssetManager({
    publication: storage,
    source,
    initialAssets: previousSyncState.assets,
  });

  const metadataResults = await mapWithConcurrency(
    documents,
    DOCUMENT_SYNC_CONCURRENCY,
    async (document) => {
      const previousState =
        previousSyncState.documents[document.sourceNodeToken];
      let revision: SourceDocumentRevision;

      try {
        revision = await source.inspectDocument(document);
      } catch (error) {
        // Keep the sync resilient: skip one broken doc instead of aborting all.
        console.error(
          `Failed to inspect document ${document.sourceDocumentId}`,
          error,
        );

        if (!previousState) {
          return null;
        }

        const previousArticle = await storage.readArticle(previousState.slug);

        if (!previousArticle) {
          return null;
        }

        return {
          document: {
            ...document,
            revisionId: previousState.revisionId,
            updatedAt: previousState.objEditTime,
            coverToken: previousState.coverToken,
          },
          previousState,
          previousArticle,
          revisionId: previousState.revisionId,
          objEditTime: previousState.objEditTime,
          coverToken: previousState.coverToken,
          shouldRefresh: true,
          inspectionFailed: true,
        } satisfies DocumentMetadata;
      }

      const isUnchanged = hasSameDocumentVersion(previousState, revision);
      const previousArticle = previousState
        ? await storage.readArticle(previousState.slug)
        : undefined;

      return {
        document: revision,
        previousState,
        previousArticle,
        revisionId: revision.revisionId,
        objEditTime: revision.updatedAt,
        coverToken: revision.coverToken,
        shouldRefresh: !isUnchanged || !previousArticle,
      } satisfies DocumentMetadata;
    },
  );
  const metadata = metadataResults.filter(Boolean) as DocumentMetadata[];

  const rawArticleResults = await mapWithConcurrency(
    metadata.filter(
      (document) => document.shouldRefresh && !document.inspectionFailed,
    ),
    DOCUMENT_SYNC_CONCURRENCY,
    async (document) => {
      try {
        const { markdown, fileTokens, meta } = await source.readDocument(
          document.document,
        );
        const parsed = matter(markdown);
        const frontmatter = normalizeFrontmatter({
          ...meta,
          ...(parsed.data as Record<string, unknown>),
        });

        return {
          document: document.document,
          title:
            frontmatter.title ||
            document.document.documentTitle ||
            document.document.title,
          fileTokens,
          frontmatter,
          content: stripLeadingHeading(
            parsed.content.trim(),
            frontmatter.title ||
              document.document.documentTitle ||
              document.document.title,
          ),
          documentCoverToken: document.coverToken,
        } satisfies RawArticle;
      } catch (error) {
        // Keep the sync resilient: skip one broken doc instead of aborting all.
        console.error(
          `Failed to sync document ${document.document.sourceDocumentId}`,
          error,
        );
        return null;
      }
    },
  );
  const rawArticles = rawArticleResults.filter(Boolean) as RawArticle[];
  const rawArticlesByNodeToken = new Map(
    rawArticles.map((article) => [article.document.sourceNodeToken, article]),
  );
  const activeDocuments = metadata.filter(
    (document) =>
      Boolean(document.previousArticle) ||
      rawArticlesByNodeToken.has(document.document.sourceNodeToken),
  );

  const nodeTokenToSlug = buildSlugMap(activeDocuments, rawArticlesByNodeToken);
  const articles: Article[] = [];
  const nextDocuments: BlogSyncState['documents'] = {};
  let fallbackArticles = 0;
  let reusedArticles = 0;
  const slugRewrites = activeDocuments.reduce<Record<string, string>>(
    (acc, document) => {
      const slug = nodeTokenToSlug.get(document.document.sourceNodeToken);

      if (
        slug &&
        document.previousState?.slug &&
        document.previousState.slug !== slug
      ) {
        acc[`/blog/${document.previousState.slug}`] = `/blog/${slug}`;
      }

      return acc;
    },
    {},
  );

  for (const document of activeDocuments) {
    const slug = nodeTokenToSlug.get(document.document.sourceNodeToken);
    if (!slug) continue;

    const rawArticle = rawArticlesByNodeToken.get(
      document.document.sourceNodeToken,
    );
    let article: Article;
    let assetTokens: string[];

    if (rawArticle) {
      const rewritten = await rewriteArticleContent(
        assetManager,
        rawArticle,
        nodeTokenToSlug,
      );

      article = parseArticle(
        {
          ...rawArticle,
          documentCoverUrl: rewritten.cover,
          content: rewritten.content,
        },
        slug,
      );
      assetTokens = rewritten.assetTokens;

      await storage.writeArticle(article);
    } else if (document.previousArticle) {
      if (document.shouldRefresh) {
        fallbackArticles += 1;
      } else {
        reusedArticles += 1;
      }

      article =
        Object.keys(slugRewrites).length > 0
          ? {
              ...document.previousArticle,
              content: replaceTokens(
                document.previousArticle.content,
                slugRewrites,
              ),
            }
          : document.previousArticle;
      assetTokens = document.previousState?.assetTokens || [];

      if (article !== document.previousArticle) {
        await storage.writeArticle(article);
      }
    } else {
      continue;
    }

    articles.push(article);
    nextDocuments[document.document.sourceNodeToken] =
      document.shouldRefresh && !rawArticle && document.previousState
        ? {
            ...document.previousState,
            assetTokens,
          }
        : {
            slug: article.slug,
            sourceDocumentId: document.document.sourceDocumentId,
            objEditTime: document.objEditTime,
            revisionId: document.revisionId,
            coverToken: document.coverToken,
            assetTokens,
          };
  }

  const publicArticles = sortArticlesByDate(
    articles.map<ArticleSummary>((article) => ({
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
    })),
  );
  const generatedAt = new Date().toISOString();

  const index: ArticleIndex = {
    generatedAt,
    source: 'feishu',
    articles: publicArticles,
  };
  const searchIndex = buildArticleSearchIndex({
    generatedAt,
    source: 'feishu',
    articles,
  });

  const activeAssetTokens = new Set(
    Object.values(nextDocuments).flatMap((document) => document.assetTokens),
  );
  const nextAssets = await assetManager.pruneUnusedAssets(activeAssetTokens);

  await storage.writeIndex(index);
  await storage.writeSearchIndex(searchIndex);
  await storage.writeSyncState({
    generatedAt,
    source: 'feishu',
    documents: nextDocuments,
    assets: nextAssets,
  });
  const assetStats = assetManager.getStats();

  return {
    storage: storage.name,
    totalDocuments: activeDocuments.length,
    totalArticles: publicArticles.length,
    reusedArticles,
    changedArticles: rawArticles.length,
    fallbackArticles,
    downloadedAssets: assetStats.downloadedAssets,
    reusedAssets: assetStats.reusedAssets,
    deletedAssets: assetStats.deletedAssets,
    failedAssetDeletes: assetStats.failedAssetDeletes,
  };
};

export const createFeishuArticleSync =
  (resolveBindings: () => ArticleSyncBindings): RunFeishuArticleSync =>
  async (options = {}) => {
    const bindings = resolveBindings();

    if (bindings.availability === 'missing-config') {
      if (options.optional) {
        return {
          skipped: true,
          reason: `Missing env: ${bindings.missingKeys.join(', ')}`,
          storage: bindings.publication.name,
        };
      }

      throw new Error(
        `Missing Feishu env vars: ${bindings.missingKeys.join(', ')}`,
      );
    }

    return runFeishuArticleSync(bindings.source, bindings.publication);
  };

const resolveProductionBindings = (): ArticleSyncBindings => {
  const publication = getBlogStorage();
  const {
    feishu: { appId, appSecret, spaceId },
  } = getServerEnv();
  const missingKeys = [
    ...(!appId ? ['FEISHU_APP_ID'] : []),
    ...(!appSecret ? ['FEISHU_APP_SECRET'] : []),
    ...(!spaceId ? ['FEISHU_SPACE_ID'] : []),
  ];

  if (missingKeys.length > 0) {
    return {
      availability: 'missing-config',
      missingKeys,
      publication,
    };
  }

  return {
    availability: 'ready',
    source: createFeishuArticleSource({ appId, appSecret, spaceId }),
    publication,
  };
};

export const syncFeishuArticles = createFeishuArticleSync(
  resolveProductionBindings,
);
