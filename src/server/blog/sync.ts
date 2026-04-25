/* eslint-disable no-console */
import type { FileToken } from 'feishu-docx/dist/index.js';
import { MarkdownRenderer } from 'feishu-docx/dist/index.js';
import matter from 'gray-matter';

import { SITE_DEFAULT_BLOG_COVER } from '@/common/config/site';
import {
  Article,
  ArticleFrontmatter,
  ArticleIndex,
  ArticleSummary,
  ArticleTag,
  BlogSyncAssetState,
  BlogSyncDocumentState,
  BlogSyncState,
} from '@/common/types/blog';
import { getServerEnv } from '@/server/env';

import { FeishuClient, FeishuWikiNode } from './feishu';
import { getBlogStorage } from './storage';
import {
  calculateReadingTime,
  ensureUniqueSlug,
  extensionFromType,
  extractLinkedTokens,
  isHiddenTitle,
  parseContentDispositionName,
  replaceTokens,
  sanitizeFileName,
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
};

type RawArticle = {
  node: FeishuWikiNode;
  title: string;
  markdown: string;
  fileTokens: Record<string, FileToken>;
  frontmatter: ArticleFrontmatter;
  content: string;
  documentCoverToken?: string;
  documentCoverUrl?: string;
};

type DocumentMetadata = {
  node: FeishuWikiNode;
  documentInfo: Awaited<ReturnType<FeishuClient['getDocumentInfo']>>;
  previousState?: BlogSyncDocumentState;
  previousArticle?: Article | null;
  revisionId?: string;
  objEditTime?: string;
  coverToken?: string;
  shouldRefresh: boolean;
};

type AssetSyncStats = {
  downloadedAssets: number;
  reusedAssets: number;
};

type AssetResolver = {
  assets: Record<string, BlogSyncAssetState>;
  resolveAsset: (
    fileToken: FileToken,
    directory?: string,
  ) => Promise<BlogSyncAssetState>;
};

const baseRequiredEnvKeys = ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'] as const;
const DOCUMENT_SYNC_CONCURRENCY = 3;
const ASSET_SYNC_CONCURRENCY = 4;

const getSyncSpaceId = () => getServerEnv().feishu.spaceId;

const getMissingEnvKeys = () => {
  const missing: string[] = baseRequiredEnvKeys.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (!getSyncSpaceId()) {
    missing.push('FEISHU_SPACE_ID');
  }

  return missing;
};

const mapWithConcurrency = async <Input, Output>(
  items: Input[],
  concurrency: number,
  mapper: (item: Input, index: number) => Promise<Output>,
) => {
  const results = new Array<Output>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    },
  );

  await Promise.all(workers);
  return results;
};

const normalizeOptionalString = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
};

const getDocumentRevisionId = (
  documentInfo: Awaited<ReturnType<FeishuClient['getDocumentInfo']>>,
) =>
  normalizeOptionalString(
    documentInfo?.revision_id ?? documentInfo?.latest_revision_id,
  );

const normalizeSyncState = (state: BlogSyncState | null): BlogSyncState => ({
  generatedAt: state?.generatedAt || '',
  source: 'feishu',
  documents: state?.documents || {},
  assets: state?.assets || {},
});

const hasSameDocumentVersion = (
  previous: BlogSyncDocumentState | undefined,
  current: Pick<
    DocumentMetadata,
    'coverToken' | 'objEditTime' | 'revisionId' | 'node'
  >,
) => {
  if (!previous || previous.sourceDocumentId !== current.node.obj_token) {
    return false;
  }

  if ((previous.coverToken || '') !== (current.coverToken || '')) {
    return false;
  }

  if (current.revisionId) {
    return previous.revisionId === current.revisionId;
  }

  if (current.objEditTime) {
    return previous.objEditTime === current.objEditTime;
  }

  return false;
};

const buildTagList = (input: ArticleFrontmatter['tags']): ArticleTag[] =>
  toStringArray(input).map((name) => ({
    name,
    slug: toSlug(name),
  }));

const normalizeFrontmatter = (value: Record<string, unknown>) => ({
  slug: typeof value.slug === 'string' ? value.slug : undefined,
  title: typeof value.title === 'string' ? value.title : undefined,
  date: typeof value.date === 'string' ? value.date : undefined,
  tags: value.tags as ArticleFrontmatter['tags'],
  summary: typeof value.summary === 'string' ? value.summary : undefined,
  cover: typeof value.cover === 'string' ? value.cover : undefined,
  featured: toBoolean(value.featured),
  draft: toBoolean(value.draft),
  hide: toBoolean(value.hide),
});

export const resolveArticleDates = (
  frontmatterDate: string | undefined,
  node: Pick<FeishuWikiNode, 'obj_create_time' | 'obj_edit_time'>,
) => ({
  publishedAt: toIsoDate(
    frontmatterDate || node.obj_create_time || node.obj_edit_time || undefined,
  ),
  updatedAt: toIsoDate(
    node.obj_edit_time || frontmatterDate || node.obj_create_time || undefined,
  ),
});

const parseArticle = (raw: RawArticle, slug: string): Article => {
  const tags = buildTagList(raw.frontmatter.tags);
  const title = raw.frontmatter.title || raw.title;
  const summary = raw.frontmatter.summary || summarizeMarkdown(raw.content);
  const { publishedAt, updatedAt } = resolveArticleDates(
    raw.frontmatter.date,
    raw.node,
  );
  const draft =
    raw.frontmatter.draft ||
    raw.frontmatter.hide ||
    isHiddenTitle(raw.node.title || '');
  const cover = raw.documentCoverUrl || SITE_DEFAULT_BLOG_COVER;

  return {
    id: raw.node.node_token,
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
    sourceNodeToken: raw.node.node_token,
    sourceDocumentId: raw.node.obj_token,
    content: raw.content,
    contentFormat: 'markdown',
  };
};

const createMarkdownRenderer = (
  documentId: string,
  blocks: Awaited<ReturnType<FeishuClient['getDocumentBlocks']>>,
) => {
  const renderer = new MarkdownRenderer({
    document: { document_id: documentId },
    blocks,
  });

  const markdown = renderer.parse();

  return {
    markdown,
    fileTokens: renderer.fileTokens,
    meta: renderer.meta || {},
  };
};

export const buildAssetPath = ({
  fileToken,
  contentType,
  originalName,
  directory = fileToken.type,
}: {
  fileToken: FileToken;
  contentType: string | null;
  originalName?: string | null;
  directory?: string;
}) => {
  const extension = extensionFromType(contentType, originalName);
  const safeName = sanitizeFileName(
    originalName
      ? `${fileToken.token}-${originalName}`
      : `${fileToken.token}${extension}`,
  );

  return `${directory}/${safeName || `${fileToken.token}${extension}`}`;
};

const writeAssetFromToken = async (
  storage: ReturnType<typeof getBlogStorage>,
  client: FeishuClient,
  fileToken: FileToken,
  directory: string = fileToken.type,
) => {
  const download = await client.downloadAsset(fileToken);
  const originalName = parseContentDispositionName(download.contentDisposition);
  const pathname = buildAssetPath({
    fileToken,
    contentType: download.contentType,
    originalName,
    directory,
  });

  const url = await storage.writeAsset({
    body: download.body,
    contentType: download.contentType,
    pathname,
  });

  return {
    pathname,
    url,
    contentType: download.contentType,
    updatedAt: new Date().toISOString(),
  };
};

const createAssetResolver = (
  storage: ReturnType<typeof getBlogStorage>,
  client: FeishuClient,
  initialAssets: Record<string, BlogSyncAssetState>,
  stats: AssetSyncStats,
): AssetResolver => {
  const assets = { ...initialAssets };
  const inFlightAssets = new Map<string, Promise<BlogSyncAssetState>>();

  const resolveAsset: AssetResolver['resolveAsset'] = async (
    fileToken,
    directory = fileToken.type,
  ) => {
    const existing = assets[fileToken.token];

    if (existing && (await storage.assetExists(existing.pathname))) {
      stats.reusedAssets += 1;
      return existing;
    }

    const pendingAsset = inFlightAssets.get(fileToken.token);

    if (pendingAsset) {
      return pendingAsset;
    }

    const nextAsset = writeAssetFromToken(
      storage,
      client,
      fileToken,
      directory,
    ).then((asset) => {
      stats.downloadedAssets += 1;
      assets[fileToken.token] = asset;
      return asset;
    });

    inFlightAssets.set(fileToken.token, nextAsset);

    try {
      return await nextAsset;
    } finally {
      inFlightAssets.delete(fileToken.token);
    }
  };

  return {
    assets,
    resolveAsset,
  };
};

const downloadAssets = async (
  assetResolver: AssetResolver,
  fileTokens: Record<string, FileToken>,
) => {
  const assetEntries: Record<string, string> = {};
  const uniqueFileTokens = [
    ...new Map(
      Object.values(fileTokens).map((fileToken) => [
        fileToken.token,
        fileToken,
      ]),
    ).values(),
  ];

  const assets = await mapWithConcurrency(
    uniqueFileTokens,
    ASSET_SYNC_CONCURRENCY,
    async (fileToken) => ({
      fileToken,
      asset: await assetResolver.resolveAsset(fileToken),
    }),
  );

  assets.forEach(({ fileToken, asset }) => {
    assetEntries[fileToken.token] = asset.url;
  });

  return assetEntries;
};

const buildSlugMap = (
  documents: DocumentMetadata[],
  rawArticlesByNodeToken: Map<string, RawArticle>,
) => {
  const slugs = new Set<string>();
  const mapping = new Map<string, string>();

  documents.forEach((document) => {
    const rawArticle = rawArticlesByNodeToken.get(document.node.node_token);
    const preferredSlug = rawArticle
      ? toSlug(
          rawArticle.frontmatter.slug ||
            rawArticle.frontmatter.title ||
            rawArticle.title,
        )
      : document.previousState?.slug || toSlug(document.node.title);
    const slug = ensureUniqueSlug(
      preferredSlug,
      document.node.node_token.slice(-6),
      slugs,
    );
    mapping.set(document.node.node_token, slug);
  });

  return mapping;
};

const rewriteArticleContent = async (
  assetResolver: AssetResolver,
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

  const assets = await downloadAssets(assetResolver, rawArticle.fileTokens);
  const assetTokens = new Set(Object.keys(assets));
  const content = replaceTokens(rawArticle.content, {
    ...internalLinks,
    ...assets,
  });
  let cover: string | undefined;

  if (rawArticle.documentCoverToken) {
    cover =
      assets[rawArticle.documentCoverToken] ||
      (
        await assetResolver.resolveAsset(
          {
            token: rawArticle.documentCoverToken,
            type: 'image',
          },
          'cover',
        )
      ).url;
    assetTokens.add(rawArticle.documentCoverToken);
  }

  return {
    content,
    cover,
    assetTokens: [...assetTokens],
  };
};

export const syncFeishuArticles = async (
  options: SyncOptions = {},
): Promise<SyncResult> => {
  const missingEnvKeys = getMissingEnvKeys();
  const storage = getBlogStorage();

  if (missingEnvKeys.length > 0) {
    if (options.optional) {
      return {
        skipped: true,
        reason: `Missing env: ${missingEnvKeys.join(', ')}`,
        storage: storage.name,
      };
    }

    throw new Error(`Missing Feishu env vars: ${missingEnvKeys.join(', ')}`);
  }

  const {
    feishu: { appId, appSecret },
  } = getServerEnv();
  const client = new FeishuClient(appId, appSecret);

  const spaceId = getSyncSpaceId();

  if (!spaceId) {
    throw new Error('Missing Feishu sync space.');
  }

  const nodes = await client.listDocNodesBySpace(spaceId);
  const previousSyncState = normalizeSyncState(await storage.readSyncState());
  const assetStats: AssetSyncStats = {
    downloadedAssets: 0,
    reusedAssets: 0,
  };
  const assetResolver = createAssetResolver(
    storage,
    client,
    previousSyncState.assets,
    assetStats,
  );

  const metadataResults = await mapWithConcurrency(
    nodes,
    DOCUMENT_SYNC_CONCURRENCY,
    async (node) => {
      try {
        const latestNode =
          (await client.getNode(node.space_id, node.node_token)) || node;
        const documentInfo = await client.getDocumentInfo(latestNode.obj_token);
        const revisionId = getDocumentRevisionId(documentInfo);
        const objEditTime = normalizeOptionalString(latestNode.obj_edit_time);
        const coverToken = documentInfo?.cover?.token;
        const previousState =
          previousSyncState.documents[latestNode.node_token];
        const isUnchanged = hasSameDocumentVersion(previousState, {
          node: latestNode,
          revisionId,
          objEditTime,
          coverToken,
        });
        const previousArticle =
          isUnchanged && previousState
            ? await storage.readArticle(previousState.slug)
            : undefined;

        return {
          node: latestNode,
          documentInfo,
          previousState,
          previousArticle,
          revisionId,
          objEditTime,
          coverToken,
          shouldRefresh: !isUnchanged || !previousArticle,
        } satisfies DocumentMetadata;
      } catch (error) {
        // Keep the sync resilient: skip one broken doc instead of aborting all.
        console.error(`Failed to inspect document ${node.obj_token}`, error);
        return null;
      }
    },
  );
  const metadata = metadataResults.filter(Boolean) as DocumentMetadata[];

  const rawArticleResults = await mapWithConcurrency(
    metadata.filter((document) => document.shouldRefresh),
    DOCUMENT_SYNC_CONCURRENCY,
    async (document) => {
      try {
        const blocks = await client.getDocumentBlocks(document.node.obj_token);
        const { markdown, fileTokens, meta } = createMarkdownRenderer(
          document.node.obj_token,
          blocks,
        );
        const parsed = matter(markdown);
        const frontmatter = normalizeFrontmatter({
          ...meta,
          ...(parsed.data as Record<string, unknown>),
        });

        return {
          node: document.node,
          title:
            frontmatter.title ||
            document.documentInfo?.title ||
            document.node.title,
          markdown,
          fileTokens,
          frontmatter,
          content: stripLeadingHeading(
            parsed.content.trim(),
            frontmatter.title ||
              document.documentInfo?.title ||
              document.node.title,
          ),
          documentCoverToken: document.coverToken,
        } satisfies RawArticle;
      } catch (error) {
        // Keep the sync resilient: skip one broken doc instead of aborting all.
        console.error(
          `Failed to sync document ${document.node.obj_token}`,
          error,
        );
        return null;
      }
    },
  );
  const rawArticles = rawArticleResults.filter(Boolean) as RawArticle[];
  const rawArticlesByNodeToken = new Map(
    rawArticles.map((article) => [article.node.node_token, article]),
  );
  const activeDocuments = metadata.filter(
    (document) =>
      (!document.shouldRefresh && document.previousArticle) ||
      rawArticlesByNodeToken.has(document.node.node_token),
  );

  const nodeTokenToSlug = buildSlugMap(activeDocuments, rawArticlesByNodeToken);
  const articles: Article[] = [];
  const nextDocuments: BlogSyncState['documents'] = {};
  const slugRewrites = activeDocuments.reduce<Record<string, string>>(
    (acc, document) => {
      const slug = nodeTokenToSlug.get(document.node.node_token);

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
    const slug = nodeTokenToSlug.get(document.node.node_token);
    if (!slug) continue;

    const rawArticle = rawArticlesByNodeToken.get(document.node.node_token);
    let article: Article;
    let assetTokens: string[];

    if (rawArticle) {
      const rewritten = await rewriteArticleContent(
        assetResolver,
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
    nextDocuments[document.node.node_token] = {
      slug: article.slug,
      sourceDocumentId: document.node.obj_token,
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

  await storage.writeIndex(index);
  await storage.writeSyncState({
    generatedAt,
    source: 'feishu',
    documents: nextDocuments,
    assets: assetResolver.assets,
  });

  return {
    storage: storage.name,
    totalDocuments: activeDocuments.length,
    totalArticles: publicArticles.length,
    reusedArticles: activeDocuments.length - rawArticles.length,
    changedArticles: rawArticles.length,
    downloadedAssets: assetStats.downloadedAssets,
    reusedAssets: assetStats.reusedAssets,
  };
};
