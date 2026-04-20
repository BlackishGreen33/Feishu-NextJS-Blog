/* eslint-disable no-console */
import { FileToken, MarkdownRenderer } from 'feishu-docx';
import matter from 'gray-matter';

import {
  Article,
  ArticleFrontmatter,
  ArticleIndex,
  ArticleSummary,
  ArticleTag,
} from '@/common/types/blog';

import { FeishuClient, FeishuWikiNode } from './feishu';
import { getBlogStorage } from './storage';
import {
  calculateReadingTime,
  ensureUniqueSlug,
  extensionFromType,
  extractFirstImage,
  extractLinkedTokens,
  isHiddenTitle,
  parseContentDispositionName,
  replaceTokens,
  sanitizeFileName,
  sortArticlesByDate,
  summarizeMarkdown,
  toBoolean,
  toIsoDate,
  toSlug,
  toStringArray,
  wait,
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
};

type RawArticle = {
  node: FeishuWikiNode;
  title: string;
  markdown: string;
  fileTokens: Record<string, FileToken>;
  frontmatter: ArticleFrontmatter;
  content: string;
};

const requiredEnvKeys = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_ROOT_NODE_TOKEN',
] as const;

const getMissingEnvKeys = () =>
  requiredEnvKeys.filter((key) => !process.env[key]?.trim());

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

const parseArticle = (raw: RawArticle, slug: string): Article => {
  const tags = buildTagList(raw.frontmatter.tags);
  const title = raw.frontmatter.title || raw.title;
  const summary = raw.frontmatter.summary || summarizeMarkdown(raw.content);
  const publishedAt = toIsoDate(
    raw.frontmatter.date || raw.node.obj_edit_time || undefined,
  );
  const updatedAt = toIsoDate(raw.node.obj_edit_time || raw.frontmatter.date);
  const draft =
    raw.frontmatter.draft ||
    raw.frontmatter.hide ||
    isHiddenTitle(raw.node.title || '');
  const cover = raw.frontmatter.cover || extractFirstImage(raw.content);

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

const downloadAssets = async (
  client: FeishuClient,
  fileTokens: Record<string, FileToken>,
) => {
  const assetEntries: Record<string, string> = {};
  const storage = getBlogStorage();

  for (const fileToken of Object.values(fileTokens)) {
    const download = await client.downloadAsset(fileToken);
    const originalName = parseContentDispositionName(
      download.contentDisposition,
    );
    const extension = extensionFromType(download.contentType, originalName);
    const safeName = sanitizeFileName(
      originalName || `${fileToken.token}${extension}`,
    );
    const pathname = `${fileToken.type}/${safeName}`;

    assetEntries[fileToken.token] = await storage.writeAsset({
      body: download.body,
      contentType: download.contentType,
      pathname,
    });

    await wait(80);
  }

  return assetEntries;
};

const buildSlugMap = (documents: RawArticle[]) => {
  const slugs = new Set<string>();
  const mapping = new Map<string, string>();

  documents.forEach((document) => {
    const preferredSlug = toSlug(
      document.frontmatter.slug || document.frontmatter.title || document.title,
    );
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
  client: FeishuClient,
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

  const assets = await downloadAssets(client, rawArticle.fileTokens);
  const content = replaceTokens(rawArticle.content, {
    ...internalLinks,
    ...assets,
  });

  return {
    content,
    cover:
      rawArticle.frontmatter.cover &&
      assets[rawArticle.frontmatter.cover as keyof typeof assets]
        ? assets[rawArticle.frontmatter.cover as keyof typeof assets]
        : undefined,
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

  const client = new FeishuClient(
    process.env.FEISHU_APP_ID as string,
    process.env.FEISHU_APP_SECRET as string,
  );

  const nodes = await client.listDocNodes(
    process.env.FEISHU_ROOT_NODE_TOKEN as string,
  );

  const rawArticles: RawArticle[] = [];

  for (const node of nodes) {
    try {
      const documentInfo = await client.getDocumentInfo(node.obj_token);
      const blocks = await client.getDocumentBlocks(node.obj_token);
      const { markdown, fileTokens, meta } = createMarkdownRenderer(
        node.obj_token,
        blocks,
      );
      const parsed = matter(markdown);
      const frontmatter = normalizeFrontmatter({
        ...meta,
        ...(parsed.data as Record<string, unknown>),
      });

      rawArticles.push({
        node,
        title: frontmatter.title || documentInfo?.title || node.title,
        markdown,
        fileTokens,
        frontmatter,
        content: parsed.content.trim(),
      });
      await wait(120);
    } catch (error) {
      // Keep the sync resilient: skip one broken doc instead of aborting all.
      console.error(`Failed to sync document ${node.obj_token}`, error);
    }
  }

  const nodeTokenToSlug = buildSlugMap(rawArticles);
  const articles: Article[] = [];

  for (const rawArticle of rawArticles) {
    const slug = nodeTokenToSlug.get(rawArticle.node.node_token);
    if (!slug) continue;

    const rewritten = await rewriteArticleContent(
      client,
      rawArticle,
      nodeTokenToSlug,
    );

    const article = parseArticle(
      {
        ...rawArticle,
        frontmatter: {
          ...rawArticle.frontmatter,
          cover: rewritten.cover || rawArticle.frontmatter.cover,
        },
        content: rewritten.content,
      },
      slug,
    );

    await storage.writeArticle(article);
    articles.push(article);
    await wait(80);
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

  const index: ArticleIndex = {
    generatedAt: new Date().toISOString(),
    source: 'feishu',
    articles: publicArticles,
  };

  await storage.writeIndex(index);

  return {
    storage: storage.name,
    totalDocuments: rawArticles.length,
    totalArticles: publicArticles.length,
  };
};
