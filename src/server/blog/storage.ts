import { BlobNotFoundError, del, head, put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

import {
  articleIndexSchema,
  articleSchema,
  articleSearchIndexSchema,
} from '@/common/schemas/blog';
import { Article, ArticleIndex, ArticleSearchIndex } from '@/common/types/blog';
import { getServerEnv } from '@/server/env';

import { BlogSyncState, blogSyncStateSchema } from './sync-state';

const SEEDED_DATA_DIR = path.join(process.cwd(), 'data', 'feishu-blog');
const SEEDED_ARTICLES_DIR = path.join(SEEDED_DATA_DIR, 'articles');
const LOCAL_CACHE_DATA_DIR = path.join(process.cwd(), '.cache', 'feishu-blog');
const LOCAL_CACHE_ARTICLES_DIR = path.join(LOCAL_CACHE_DATA_DIR, 'articles');
const LOCAL_CACHE_PUBLIC_ASSETS_DIR = path.join(
  process.cwd(),
  'public',
  'local-feishu-assets',
);
const LOCAL_CACHE_ASSET_BASE_PATH = '/local-feishu-assets';

const BLOB_PREFIX = 'feishu-blog';
const BLOB_INDEX_PATH = `${BLOB_PREFIX}/index.json`;
const BLOB_SEARCH_INDEX_PATH = `${BLOB_PREFIX}/search-index.json`;
const BLOB_SYNC_STATE_PATH = `${BLOB_PREFIX}/sync-state.json`;
const BLOB_ARTICLES_PREFIX = `${BLOB_PREFIX}/articles`;
const BLOB_ASSETS_PREFIX = `${BLOB_PREFIX}/assets`;
const BLOB_JSON_CACHE_TTL_MS = 60 * 1000;

type AssetWriteOptions = {
  body: Buffer;
  contentType?: string | null;
  pathname: string;
};

type LocalJsonCacheEntry = {
  mtimeMs: number;
  size: number;
  value: unknown;
};

type BlobJsonCacheEntry = {
  expiresAt: number;
  value: unknown;
};

export interface BlogStorageAdapter {
  name: 'local' | 'blob';
  readIndex: () => Promise<ArticleIndex | null>;
  writeIndex: (index: ArticleIndex) => Promise<void>;
  readSearchIndex: () => Promise<ArticleSearchIndex | null>;
  writeSearchIndex: (index: ArticleSearchIndex) => Promise<void>;
  readArticle: (slug: string) => Promise<Article | null>;
  writeArticle: (article: Article) => Promise<void>;
  deleteArticle: (slug: string) => Promise<void>;
  readSyncState: () => Promise<BlogSyncState | null>;
  writeSyncState: (state: BlogSyncState) => Promise<void>;
  assetExists: (pathname: string) => Promise<boolean>;
  writeAsset: (options: AssetWriteOptions) => Promise<string>;
  deleteAsset: (pathname: string) => Promise<void>;
}

const localJsonCache = new Map<string, LocalJsonCacheEntry>();
const blobJsonCache = new Map<string, BlobJsonCacheEntry>();

const readJsonFile = async <T>(
  filePath: string,
  parse: (value: unknown) => T,
) => {
  try {
    const stat = await fs.stat(filePath);
    const cached = localJsonCache.get(filePath);

    if (cached?.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return parse(cached.value);
    }

    const content = await fs.readFile(filePath, 'utf8');
    const raw: unknown = JSON.parse(content);
    const value = parse(raw);

    localJsonCache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      value,
    });

    return value;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      localJsonCache.delete(filePath);
      return null;
    }

    throw error;
  }
};

const writeJsonFile = async <T>(filePath: string, value: T) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  const stat = await fs.stat(filePath);

  localJsonCache.set(filePath, {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    value,
  });
};

const readFirstJsonFile = async <T>(
  filePaths: string[],
  parse: (value: unknown) => T,
) => {
  for (const filePath of filePaths) {
    const content = await readJsonFile(filePath, parse);

    if (content) {
      return content;
    }
  }

  return null;
};

const ensureLocalDirs = async () => {
  await Promise.all([
    fs.mkdir(LOCAL_CACHE_DATA_DIR, { recursive: true }),
    fs.mkdir(LOCAL_CACHE_ARTICLES_DIR, { recursive: true }),
    fs.mkdir(LOCAL_CACHE_PUBLIC_ASSETS_DIR, { recursive: true }),
  ]);
};

const localStorage: BlogStorageAdapter = {
  name: 'local',
  async readIndex() {
    return readFirstJsonFile(
      [
        path.join(LOCAL_CACHE_DATA_DIR, 'index.json'),
        path.join(SEEDED_DATA_DIR, 'index.json'),
      ],
      articleIndexSchema.parse,
    );
  },
  async writeIndex(index) {
    await ensureLocalDirs();
    await writeJsonFile(path.join(LOCAL_CACHE_DATA_DIR, 'index.json'), index);
  },
  async readSearchIndex() {
    return readFirstJsonFile(
      [
        path.join(LOCAL_CACHE_DATA_DIR, 'search-index.json'),
        path.join(SEEDED_DATA_DIR, 'search-index.json'),
      ],
      articleSearchIndexSchema.parse,
    );
  },
  async writeSearchIndex(index) {
    await ensureLocalDirs();
    await writeJsonFile(
      path.join(LOCAL_CACHE_DATA_DIR, 'search-index.json'),
      index,
    );
  },
  async readArticle(slug) {
    return readFirstJsonFile(
      [
        path.join(LOCAL_CACHE_ARTICLES_DIR, `${slug}.json`),
        path.join(SEEDED_ARTICLES_DIR, `${slug}.json`),
      ],
      articleSchema.parse,
    );
  },
  async writeArticle(article) {
    await ensureLocalDirs();
    await writeJsonFile(
      path.join(LOCAL_CACHE_ARTICLES_DIR, `${article.slug}.json`),
      article,
    );
  },
  async deleteArticle(slug) {
    const filePath = path.join(LOCAL_CACHE_ARTICLES_DIR, `${slug}.json`);
    await fs.rm(filePath, { force: true });
    localJsonCache.delete(filePath);
  },
  async readSyncState() {
    return readJsonFile(
      path.join(LOCAL_CACHE_DATA_DIR, 'sync-state.json'),
      blogSyncStateSchema.parse,
    );
  },
  async writeSyncState(state) {
    await ensureLocalDirs();
    await writeJsonFile(
      path.join(LOCAL_CACHE_DATA_DIR, 'sync-state.json'),
      state,
    );
  },
  async assetExists(pathname) {
    try {
      await fs.access(path.join(LOCAL_CACHE_PUBLIC_ASSETS_DIR, pathname));
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return false;
      }

      throw error;
    }
  },
  async writeAsset({ body, pathname: filePath }) {
    await ensureLocalDirs();
    const localPath = path.join(LOCAL_CACHE_PUBLIC_ASSETS_DIR, filePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, new Uint8Array(body));
    return `${LOCAL_CACHE_ASSET_BASE_PATH}/${filePath}`;
  },
  async deleteAsset(pathname) {
    await fs.rm(path.join(LOCAL_CACHE_PUBLIC_ASSETS_DIR, pathname), {
      force: true,
    });
  },
};

const isBlobNotFoundError = (error: unknown) =>
  error instanceof BlobNotFoundError ||
  (typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'BlobNotFoundError');

const readBlobJson = async <T>(
  pathname: string,
  parse: (value: unknown) => T,
) => {
  const cached = blobJsonCache.get(pathname);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value === null ? null : parse(cached.value);
  }

  try {
    const metadata = await head(pathname);
    const response = await fetch(metadata.url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch blob ${pathname}: ${response.status}`);
    }

    const raw: unknown = await response.json();
    const value = parse(raw);

    blobJsonCache.set(pathname, {
      expiresAt: Date.now() + BLOB_JSON_CACHE_TTL_MS,
      value,
    });

    return value;
  } catch (error) {
    if (isBlobNotFoundError(error)) {
      blobJsonCache.set(pathname, {
        expiresAt: Date.now() + BLOB_JSON_CACHE_TTL_MS,
        value: null,
      });

      return null;
    }

    throw error;
  }
};

const writeBlobJson = async <T>(pathname: string, value: T) => {
  await put(pathname, JSON.stringify(value, null, 2), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json',
  });

  blobJsonCache.set(pathname, {
    expiresAt: Date.now() + BLOB_JSON_CACHE_TTL_MS,
    value,
  });
};

const blobStorage: BlogStorageAdapter = {
  name: 'blob',
  async readIndex() {
    return readBlobJson(BLOB_INDEX_PATH, articleIndexSchema.parse);
  },
  async writeIndex(index) {
    await writeBlobJson(BLOB_INDEX_PATH, index);
  },
  async readSearchIndex() {
    return readBlobJson(BLOB_SEARCH_INDEX_PATH, articleSearchIndexSchema.parse);
  },
  async writeSearchIndex(index) {
    await writeBlobJson(BLOB_SEARCH_INDEX_PATH, index);
  },
  async readArticle(slug) {
    return readBlobJson(
      `${BLOB_ARTICLES_PREFIX}/${slug}.json`,
      articleSchema.parse,
    );
  },
  async writeArticle(article) {
    await writeBlobJson(
      `${BLOB_ARTICLES_PREFIX}/${article.slug}.json`,
      article,
    );
  },
  async deleteArticle(slug) {
    const pathname = `${BLOB_ARTICLES_PREFIX}/${slug}.json`;
    await del(pathname);
    blobJsonCache.set(pathname, {
      expiresAt: Date.now() + BLOB_JSON_CACHE_TTL_MS,
      value: null,
    });
  },
  async readSyncState() {
    return readBlobJson(BLOB_SYNC_STATE_PATH, blogSyncStateSchema.parse);
  },
  async writeSyncState(state) {
    await writeBlobJson(BLOB_SYNC_STATE_PATH, state);
  },
  async assetExists(pathname) {
    try {
      await head(`${BLOB_ASSETS_PREFIX}/${pathname}`);
      return true;
    } catch (error) {
      if (isBlobNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  },
  async writeAsset({ body, contentType, pathname }) {
    const result = await put(`${BLOB_ASSETS_PREFIX}/${pathname}`, body, {
      access: 'public',
      allowOverwrite: true,
      contentType: contentType || 'application/octet-stream',
    });

    return result.url;
  },
  async deleteAsset(pathname) {
    await del(`${BLOB_ASSETS_PREFIX}/${pathname}`);
  },
};

export const getBlogStorage = (): BlogStorageAdapter => {
  const { blobReadWriteToken, isVercel } = getServerEnv();
  const shouldUseBlob = Boolean(isVercel && blobReadWriteToken);

  return shouldUseBlob ? blobStorage : localStorage;
};
