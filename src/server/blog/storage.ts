import { BlobNotFoundError, head, put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

import { Article, ArticleIndex } from '@/common/types/blog';

const DATA_DIR = path.join(process.cwd(), 'data', 'feishu-blog');
const ARTICLES_DIR = path.join(DATA_DIR, 'articles');
const PUBLIC_ASSETS_DIR = path.join(process.cwd(), 'public', 'feishu-assets');

const BLOB_PREFIX = 'feishu-blog';
const BLOB_INDEX_PATH = `${BLOB_PREFIX}/index.json`;
const BLOB_ARTICLES_PREFIX = `${BLOB_PREFIX}/articles`;
const BLOB_ASSETS_PREFIX = `${BLOB_PREFIX}/assets`;

type AssetWriteOptions = {
  body: Buffer;
  contentType?: string | null;
  pathname: string;
};

export interface BlogStorageAdapter {
  name: 'local' | 'blob';
  readIndex: () => Promise<ArticleIndex | null>;
  writeIndex: (index: ArticleIndex) => Promise<void>;
  readArticle: (slug: string) => Promise<Article | null>;
  writeArticle: (article: Article) => Promise<void>;
  writeAsset: (options: AssetWriteOptions) => Promise<string>;
}

const readJsonFile = async <T>(filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const ensureLocalDirs = async () => {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }),
    fs.mkdir(ARTICLES_DIR, { recursive: true }),
    fs.mkdir(PUBLIC_ASSETS_DIR, { recursive: true }),
  ]);
};

const localStorage: BlogStorageAdapter = {
  name: 'local',
  async readIndex() {
    return readJsonFile<ArticleIndex>(path.join(DATA_DIR, 'index.json'));
  },
  async writeIndex(index) {
    await ensureLocalDirs();
    await fs.writeFile(
      path.join(DATA_DIR, 'index.json'),
      JSON.stringify(index, null, 2),
      'utf8',
    );
  },
  async readArticle(slug) {
    return readJsonFile<Article>(path.join(ARTICLES_DIR, `${slug}.json`));
  },
  async writeArticle(article) {
    await ensureLocalDirs();
    await fs.writeFile(
      path.join(ARTICLES_DIR, `${article.slug}.json`),
      JSON.stringify(article, null, 2),
      'utf8',
    );
  },
  async writeAsset({ body, pathname: filePath }) {
    await ensureLocalDirs();
    const localPath = path.join(PUBLIC_ASSETS_DIR, filePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, new Uint8Array(body));
    return `/feishu-assets/${filePath}`;
  },
};

const readBlobJson = async <T>(pathname: string) => {
  try {
    const metadata = await head(pathname);
    const response = await fetch(metadata.url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch blob ${pathname}: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }

    throw error;
  }
};

const blobStorage: BlogStorageAdapter = {
  name: 'blob',
  async readIndex() {
    return readBlobJson<ArticleIndex>(BLOB_INDEX_PATH);
  },
  async writeIndex(index) {
    await put(BLOB_INDEX_PATH, JSON.stringify(index, null, 2), {
      access: 'public',
      allowOverwrite: true,
      contentType: 'application/json',
    });
  },
  async readArticle(slug) {
    return readBlobJson<Article>(`${BLOB_ARTICLES_PREFIX}/${slug}.json`);
  },
  async writeArticle(article) {
    await put(
      `${BLOB_ARTICLES_PREFIX}/${article.slug}.json`,
      JSON.stringify(article, null, 2),
      {
        access: 'public',
        allowOverwrite: true,
        contentType: 'application/json',
      },
    );
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
  const shouldUseBlob = Boolean(
    process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN,
  );

  return shouldUseBlob ? blobStorage : localStorage;
};
