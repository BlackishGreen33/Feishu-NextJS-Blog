import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { Article, ArticleIndex, BlogSyncState } from '@/common/types/blog';

jest.mock('@vercel/blob', () => ({
  BlobNotFoundError: class BlobNotFoundError extends Error {},
  del: jest.fn(),
  head: jest.fn(),
  put: jest.fn(),
}));

const sampleArticleSummary: ArticleIndex['articles'][number] = {
  id: 'article-1',
  slug: 'hello-agent',
  title: 'Hello Agent',
  summary: 'Local cache should not dirty tracked seed data.',
  cover: null,
  publishedAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  tags: [{ name: 'AI', slug: 'ai' }],
  featured: false,
  draft: false,
  readingTimeMinutes: 2,
  sourceNodeToken: 'node-token',
  sourceDocumentId: 'doc-id',
};

const sampleIndex: ArticleIndex = {
  generatedAt: '2026-04-23T00:00:00.000Z',
  source: 'feishu',
  articles: [sampleArticleSummary],
};

const sampleArticle: Article = {
  ...sampleArticleSummary,
  content: '# Hello Agent',
  contentFormat: 'markdown',
};

const sampleSyncState: BlogSyncState = {
  generatedAt: '2026-04-23T00:00:00.000Z',
  source: 'feishu',
  documents: {
    'node-token': {
      slug: sampleArticle.slug,
      sourceDocumentId: sampleArticle.sourceDocumentId,
      objEditTime: '1776561839',
      revisionId: 'rev-1',
      assetTokens: ['asset-token'],
    },
  },
  assets: {
    'asset-token': {
      pathname: 'image/example.png',
      url: '/local-feishu-assets/image/example.png',
      contentType: 'image/png',
      updatedAt: '2026-04-23T00:00:00.000Z',
    },
  },
};

describe('blog storage local cache', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feishu-blog-storage-'));
    process.chdir(tempDir);
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('falls back to seeded repo data when no local cache exists', async () => {
    const seededDataDir = path.join(tempDir, 'data', 'feishu-blog');
    await fs.mkdir(path.join(seededDataDir, 'articles'), { recursive: true });
    await fs.writeFile(
      path.join(seededDataDir, 'index.json'),
      JSON.stringify(sampleIndex, null, 2),
      'utf8',
    );
    await fs.writeFile(
      path.join(seededDataDir, 'articles', `${sampleArticle.slug}.json`),
      JSON.stringify(sampleArticle, null, 2),
      'utf8',
    );

    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    await expect(storage.readArticle(sampleArticle.slug)).resolves.toEqual(
      sampleArticle,
    );
  });

  it('reuses parsed local JSON while file metadata is unchanged', async () => {
    const seededDataDir = path.join(tempDir, 'data', 'feishu-blog');
    await fs.mkdir(path.join(seededDataDir, 'articles'), { recursive: true });
    await fs.writeFile(
      path.join(seededDataDir, 'index.json'),
      JSON.stringify(sampleIndex, null, 2),
      'utf8',
    );

    const readFileSpy = jest.spyOn(fs, 'readFile');
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
  });

  it('writes local sync output into ignored cache paths', async () => {
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.writeIndex(sampleIndex);
    await storage.writeArticle(sampleArticle);
    await storage.writeSyncState(sampleSyncState);
    const assetUrl = await storage.writeAsset({
      body: Buffer.from('asset-body'),
      pathname: 'image/example.png',
    });

    await expect(
      fs.readFile(path.join(tempDir, '.cache', 'feishu-blog', 'index.json')),
    ).resolves.toBeTruthy();
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          '.cache',
          'feishu-blog',
          'articles',
          `${sampleArticle.slug}.json`,
        ),
      ),
    ).resolves.toBeTruthy();
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          'public',
          'local-feishu-assets',
          'image',
          'example.png',
        ),
        'utf8',
      ),
    ).resolves.toBe('asset-body');
    await expect(
      fs.readFile(
        path.join(tempDir, '.cache', 'feishu-blog', 'sync-state.json'),
        'utf8',
      ),
    ).resolves.toContain('"revisionId": "rev-1"');
    await expect(storage.readSyncState()).resolves.toEqual(sampleSyncState);
    await expect(storage.assetExists('image/example.png')).resolves.toBe(true);
    await expect(storage.assetExists('image/missing.png')).resolves.toBe(false);
    await storage.deleteAsset('image/example.png');
    await expect(storage.assetExists('image/example.png')).resolves.toBe(false);
    await expect(
      fs.readFile(path.join(tempDir, 'data', 'feishu-blog', 'index.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(assetUrl).toBe('/local-feishu-assets/image/example.png');
  });
});

describe('blog storage blob cache', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      VERCEL: '1',
      BLOB_READ_WRITE_TOKEN: 'token',
    };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as { fetch?: typeof fetch }).fetch;
    }
    jest.restoreAllMocks();
  });

  it('caches blob JSON reads for a short TTL', async () => {
    const { head } = await import('@vercel/blob');
    const headMock = jest.mocked(head);
    headMock.mockResolvedValue({
      url: 'https://blob.example/index.json',
    } as never);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleIndex,
    });
    global.fetch = fetchMock as typeof fetch;

    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    expect(headMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('writes blob JSON through to the in-process cache', async () => {
    const { head, put } = await import('@vercel/blob');
    const headMock = jest.mocked(head);
    const putMock = jest.mocked(put);
    putMock.mockResolvedValue({
      url: 'https://blob.example/index.json',
    } as never);

    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.writeIndex(sampleIndex);
    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    expect(putMock).toHaveBeenCalledWith(
      'feishu-blog/index.json',
      JSON.stringify(sampleIndex, null, 2),
      expect.objectContaining({
        allowOverwrite: true,
        contentType: 'application/json',
      }),
    );
    expect(headMock).not.toHaveBeenCalled();
  });

  it('deletes blob assets by storage pathname', async () => {
    const { del } = await import('@vercel/blob');
    const delMock = jest.mocked(del);

    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.deleteAsset('image/example.png');

    expect(delMock).toHaveBeenCalledWith(
      'feishu-blog/assets/image/example.png',
    );
  });
});
