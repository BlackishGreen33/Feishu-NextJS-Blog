import { BlobNotFoundError, head, put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

import { Article, ArticleIndex, BlogSyncState } from '@/common/types/blog';
import { getServerEnv } from '@/server/env';

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
  readArticle: (slug: string) => Promise<Article | null>;
  writeArticle: (article: Article) => Promise<void>;
  readSyncState: () => Promise<BlogSyncState | null>;
  writeSyncState: (state: BlogSyncState) => Promise<void>;
  assetExists: (pathname: string) => Promise<boolean>;
  writeAsset: (options: AssetWriteOptions) => Promise<string>;
}

const localJsonCache = new Map<string, LocalJsonCacheEntry>();
const blobJsonCache = new Map<string, BlobJsonCacheEntry>();

const readJsonFile = async <T>(filePath: string) => {
  try {
    const stat = await fs.stat(filePath);
    const cached = localJsonCache.get(filePath);

    if (cached?.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.value as T;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const value = JSON.parse(content) as T;

    localJsonCache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      value,
    });

    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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

const readFirstJsonFile = async <T>(filePaths: string[]) => {
  for (const filePath of filePaths) {
    const content = await readJsonFile<T>(filePath);

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
    return readFirstJsonFile<ArticleIndex>([
      path.join(LOCAL_CACHE_DATA_DIR, 'index.json'),
      path.join(SEEDED_DATA_DIR, 'index.json'),
    ]);
  },
  async writeIndex(index) {
    await ensureLocalDirs();
    await writeJsonFile(path.join(LOCAL_CACHE_DATA_DIR, 'index.json'), index);
  },
  async readArticle(slug) {
    return readFirstJsonFile<Article>([
      path.join(LOCAL_CACHE_ARTICLES_DIR, `${slug}.json`),
      path.join(SEEDED_ARTICLES_DIR, `${slug}.json`),
    ]);
  },
  async writeArticle(article) {
    await ensureLocalDirs();
    await writeJsonFile(
      path.join(LOCAL_CACHE_ARTICLES_DIR, `${article.slug}.json`),
      article,
    );
  },
  async readSyncState() {
    return readJsonFile<BlogSyncState>(
      path.join(LOCAL_CACHE_DATA_DIR, 'sync-state.json'),
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
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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
};

const isBlobNotFoundError = (error: unknown) =>
  error instanceof BlobNotFoundError ||
  (error as { name?: string }).name === 'BlobNotFoundError';

const readBlobJson = async <T>(pathname: string) => {
  const cached = blobJsonCache.get(pathname);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  try {
    const metadata = await head(pathname);
    const response = await fetch(metadata.url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch blob ${pathname}: ${response.status}`);
    }

    const value = (await response.json()) as T;

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
    return readBlobJson<ArticleIndex>(BLOB_INDEX_PATH);
  },
  async writeIndex(index) {
    await writeBlobJson(BLOB_INDEX_PATH, index);
  },
  async readArticle(slug) {
    return readBlobJson<Article>(`${BLOB_ARTICLES_PREFIX}/${slug}.json`);
  },
  async writeArticle(article) {
    await writeBlobJson(
      `${BLOB_ARTICLES_PREFIX}/${article.slug}.json`,
      article,
    );
  },
  async readSyncState() {
    return readBlobJson<BlogSyncState>(BLOB_SYNC_STATE_PATH);
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
};

export const getBlogStorage = (): BlogStorageAdapter => {
  const { blobReadWriteToken, isVercel } = getServerEnv();
  const shouldUseBlob = Boolean(isVercel && blobReadWriteToken);

  return shouldUseBlob ? blobStorage : localStorage;
};
