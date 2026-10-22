import matter from 'gray-matter';

import {
  Article,
  ArticleIndex,
  ArticleSlugRedirect,
} from '@/common/types/blog';

import {
  ARTICLE_CONTENT_VERSION,
  buildArticleRedirects,
  buildSlugMap,
  DocumentMetadata,
  hasSameDocumentVersion,
  normalizeFrontmatter,
  parseArticle,
  RawArticle,
  rewriteArticleContent,
} from './article-reconciliation';
import { createArticleAssetManager } from './assets';
import { buildArticleSearchIndex, toArticleSummary } from './search';
import {
  ArticleSourceAdapter,
  resolveFeishuArticleSource,
  SourceDocumentRevision,
} from './source';
import { BlogStorageAdapter, getBlogStorage } from './storage';
import { BlogSyncState } from './sync-state';
import {
  mapWithConcurrency,
  replaceTokens,
  sortArticlesByDate,
  stripLeadingHeading,
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

const DOCUMENT_SYNC_CONCURRENCY = 3;

export type ArticleSyncPublicationAdapter = Pick<
  BlogStorageAdapter,
  | 'name'
  | 'readIndex'
  | 'readArticle'
  | 'writeArticle'
  | 'deleteArticle'
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

const runFeishuArticleSync = async (
  source: ArticleSourceAdapter,
  storage: ArticleSyncPublicationAdapter,
): Promise<SyncResult> => {
  const documents = await source.listDocuments();
  const [storedSyncState, previousIndex] = await Promise.all([
    storage.readSyncState(),
    storage.readIndex(),
  ]);
  const previousSyncState = normalizeSyncState(storedSyncState);
  const previousSlugByNodeToken = new Map(
    previousIndex?.articles.map((article) => [
      article.sourceNodeToken,
      article.slug,
    ]) || [],
  );
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
      const previousSlug =
        previousState?.slug ||
        previousSlugByNodeToken.get(document.sourceNodeToken);
      const readPreviousArticle = async () => {
        if (!previousSlug) return undefined;

        const article = await storage.readArticle(previousSlug);

        if (
          article?.slug !== previousSlug ||
          article.sourceNodeToken !== document.sourceNodeToken
        ) {
          return undefined;
        }

        return article;
      };
      let revision: SourceDocumentRevision;

      try {
        revision = await source.inspectDocument(document);
      } catch (error) {
        // Keep the sync resilient: skip one broken doc instead of aborting all.
        console.error(
          `Failed to inspect document ${document.sourceDocumentId}`,
          error,
        );

        if (!previousSlug) {
          return null;
        }

        const previousArticle = await readPreviousArticle();

        if (!previousArticle) {
          return null;
        }

        const revisionId = previousState?.revisionId;
        const updatedAt = previousState?.objEditTime || document.updatedAt;
        const coverToken = previousState?.coverToken;
        return {
          document: {
            ...document,
            ...(revisionId === undefined ? {} : { revisionId }),
            ...(updatedAt === undefined ? {} : { updatedAt }),
            ...(coverToken === undefined ? {} : { coverToken }),
          },
          previousSlug,
          previousState,
          previousArticle,
          revisionId: previousState?.revisionId,
          objEditTime: previousState?.objEditTime || document.updatedAt,
          coverToken: previousState?.coverToken,
          shouldRefresh: true,
          inspectionFailed: true,
        } satisfies DocumentMetadata;
      }

      const isUnchanged = hasSameDocumentVersion(previousState, revision);
      const previousArticle = await readPreviousArticle();

      return {
        document: revision,
        previousSlug,
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
        const sourceTitle =
          document.document.documentTitle || document.document.title;
        const parsed = matter(stripLeadingHeading(markdown, sourceTitle));
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

  const nodeTokenToSlug = buildSlugMap(
    activeDocuments,
    rawArticlesByNodeToken,
    new Set(Object.keys(previousIndex?.redirects || {})),
  );
  const articles: Article[] = [];
  const nextDocuments: BlogSyncState['documents'] = {};
  let fallbackArticles = 0;
  let reusedArticles = 0;
  const slugChanges = activeDocuments.reduce<
    Record<string, ArticleSlugRedirect>
  >((acc, document) => {
    const slug = nodeTokenToSlug.get(document.document.sourceNodeToken);

    if (slug && document.previousSlug && document.previousSlug !== slug) {
      acc[document.previousSlug] = {
        sourceNodeToken: document.document.sourceNodeToken,
        targetSlug: slug,
      };
    }

    return acc;
  }, {});
  const slugRewrites = Object.fromEntries(
    Object.entries(slugChanges).map(([from, redirect]) => [
      `/blog/${from}`,
      `/blog/${redirect.targetSlug}`,
    ]),
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
          ...(rewritten.cover === undefined
            ? {}
            : { documentCoverUrl: rewritten.cover }),
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
    if (document.shouldRefresh && !rawArticle) {
      nextDocuments[document.document.sourceNodeToken] = document.previousState
        ? { ...document.previousState, assetTokens }
        : {
            slug: article.slug,
            sourceDocumentId: document.document.sourceDocumentId,
            assetTokens,
          };
    } else {
      nextDocuments[document.document.sourceNodeToken] = {
        slug: article.slug,
        sourceDocumentId: document.document.sourceDocumentId,
        contentVersion: ARTICLE_CONTENT_VERSION,
        objEditTime: document.objEditTime,
        revisionId: document.revisionId,
        coverToken: document.coverToken,
        assetTokens,
      };
    }
  }

  const publicArticles = sortArticlesByDate(articles.map(toArticleSummary));
  const generatedAt = new Date().toISOString();
  const redirects = buildArticleRedirects(
    previousIndex?.redirects || {},
    slugChanges,
    publicArticles,
  );

  const index: ArticleIndex = {
    generatedAt,
    source: 'feishu',
    articles: publicArticles,
    redirects,
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
  await mapWithConcurrency(
    Object.keys(redirects),
    DOCUMENT_SYNC_CONCURRENCY,
    (slug) => storage.deleteArticle(slug),
  );
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

const resolveProductionBindings = (): ArticleSyncBindings => ({
  publication: getBlogStorage(),
  ...resolveFeishuArticleSource(),
});

export const syncFeishuArticles = createFeishuArticleSync(
  resolveProductionBindings,
);
