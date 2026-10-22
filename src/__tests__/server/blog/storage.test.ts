import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { Article, ArticleIndex, ArticleSearchIndex } from '@/common/types/blog';
import { BlogSyncState } from '@/server/blog/sync-state';

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

const sampleSearchIndex: ArticleSearchIndex = {
  generatedAt: sampleIndex.generatedAt,
  source: sampleIndex.source,
  articles: [
    {
      ...sampleArticleSummary,
      tagNames: ['AI'],
      bodyText: 'Hello Agent',
      searchableText:
        'hello agent local cache should not dirty tracked seed data. ai hello agent',
    },
  ],
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
      path.join(seededDataDir, 'search-index.json'),
      JSON.stringify(sampleSearchIndex, null, 2),
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
    await expect(storage.readSearchIndex()).resolves.toEqual(sampleSearchIndex);
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

  it.each([
    null,
    false,
    { ...sampleIndex, articles: null },
    { ...sampleIndex, redirects: { old: { targetSlug: 'hello-agent' } } },
    { ...sampleIndex, articles: [{ ...sampleArticleSummary, draft: 'false' }] },
  ])(
    'rejects a corrupt cached index instead of falling back: %j',
    async (value) => {
      const seedDir = path.join(tempDir, 'data', 'feishu-blog');
      const cacheDir = path.join(tempDir, '.cache', 'feishu-blog');
      await fs.mkdir(seedDir, { recursive: true });
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        path.join(seedDir, 'index.json'),
        JSON.stringify(sampleIndex),
      );
      await fs.writeFile(
        path.join(cacheDir, 'index.json'),
        JSON.stringify(value),
      );
      const { getBlogStorage } = await import('@/server/blog/storage');

      await expect(getBlogStorage().readIndex()).rejects.toMatchObject({
        name: 'ZodError',
      });
    },
  );

  it('preserves legacy optional fields and extra persisted data', async () => {
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();
    const legacyIndex = { ...sampleIndex, extra: 'kept' };
    const legacyArticle = {
      ...sampleArticle,
      cover: null,
      summary: '',
      publishedAt: 'legacy date text',
      extra: { version: 1 },
    };
    await storage.writeIndex(legacyIndex);
    await storage.writeArticle(legacyArticle);

    await expect(storage.readIndex()).resolves.toEqual(legacyIndex);
    await expect(storage.readArticle(legacyArticle.slug)).resolves.toEqual(
      legacyArticle,
    );
  });

  it('validates an Article rather than treating a wrong shape as missing', async () => {
    const articlesDir = path.join(tempDir, '.cache', 'feishu-blog', 'articles');
    await fs.mkdir(articlesDir, { recursive: true });
    await fs.writeFile(
      path.join(articlesDir, 'hello-agent.json'),
      JSON.stringify({ ...sampleArticle, content: 42 }),
    );
    const { getBlogStorage } = await import('@/server/blog/storage');

    await expect(
      getBlogStorage().readArticle('hello-agent'),
    ).rejects.toMatchObject({ name: 'ZodError' });
  });

  it.each(['sync-state.json', 'search-index.json'])(
    'rejects malformed reconciliation input: %s',
    async (filename) => {
      const dir = path.join(tempDir, '.cache', 'feishu-blog');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), '{}');
      const { getBlogStorage } = await import('@/server/blog/storage');
      const storage = getBlogStorage();
      await expect(
        filename === 'sync-state.json'
          ? storage.readSyncState()
          : storage.readSearchIndex(),
      ).rejects.toMatchObject({ name: 'ZodError' });
    },
  );

  it('stops sync before publishing or deleting when the stored index is corrupt', async () => {
    const cacheDir = path.join(tempDir, '.cache', 'feishu-blog');
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(path.join(cacheDir, 'index.json'), 'null');
    const { getBlogStorage } = await import('@/server/blog/storage');
    const { createFeishuArticleSync } = await import('@/server/blog/sync');
    const publication = {
      ...getBlogStorage(),
      writeIndex: jest.fn(),
      writeSearchIndex: jest.fn(),
      writeSyncState: jest.fn(),
      deleteArticle: jest.fn(),
      deleteAsset: jest.fn(),
    };
    const run = createFeishuArticleSync(() => ({
      availability: 'ready',
      publication,
      source: {
        listDocuments: jest.fn().mockResolvedValue([]),
        inspectDocument: jest.fn(),
        readDocument: jest.fn(),
        downloadAsset: jest.fn(),
      },
    }));

    await expect(run()).rejects.toMatchObject({ name: 'ZodError' });
    expect(publication.writeIndex).not.toHaveBeenCalled();
    expect(publication.writeSearchIndex).not.toHaveBeenCalled();
    expect(publication.writeSyncState).not.toHaveBeenCalled();
    expect(publication.deleteArticle).not.toHaveBeenCalled();
    expect(publication.deleteAsset).not.toHaveBeenCalled();
  });

  it('writes local sync output into ignored cache paths', async () => {
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.writeIndex(sampleIndex);
    await storage.writeSearchIndex(sampleSearchIndex);
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
        path.join(tempDir, '.cache', 'feishu-blog', 'search-index.json'),
      ),
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
    await expect(storage.readSearchIndex()).resolves.toEqual(sampleSearchIndex);
    await expect(storage.assetExists('image/example.png')).resolves.toBe(true);
    await expect(storage.assetExists('image/missing.png')).resolves.toBe(false);
    await storage.deleteArticle(sampleArticle.slug);
    await expect(storage.readArticle(sampleArticle.slug)).resolves.toBeNull();
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

  it.each([null, { ...sampleIndex, articles: 'invalid' }])(
    'rejects corrupt Blob JSON and retries without caching it: %j',
    async (value) => {
      const { head } = await import('@vercel/blob');
      jest
        .mocked(head)
        .mockResolvedValue({ url: 'https://blob.example/index.json' } as never);
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => value })
        .mockResolvedValueOnce({ ok: true, json: async () => sampleIndex });
      global.fetch = fetchMock as typeof fetch;
      const { getBlogStorage } = await import('@/server/blog/storage');
      const storage = getBlogStorage();

      await expect(storage.readIndex()).rejects.toMatchObject({
        name: 'ZodError',
      });
      await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('validates Blob Articles and keeps a missing Article as a cached miss', async () => {
    const { head, BlobNotFoundError } = await import('@vercel/blob');
    const headMock = jest.mocked(head);
    headMock.mockResolvedValue({
      url: 'https://blob.example/article.json',
    } as never);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...sampleArticle, contentFormat: 'html' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleArticle,
      }) as typeof fetch;
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await expect(storage.readArticle(sampleArticle.slug)).rejects.toMatchObject(
      { name: 'ZodError' },
    );
    await expect(storage.readArticle(sampleArticle.slug)).resolves.toEqual(
      sampleArticle,
    );
    headMock.mockRejectedValue(new BlobNotFoundError());
    await expect(storage.readArticle('missing')).resolves.toBeNull();
    await expect(storage.readArticle('missing')).resolves.toBeNull();
    expect(headMock).toHaveBeenCalledTimes(3);
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
    await storage.writeSearchIndex(sampleSearchIndex);
    await expect(storage.readIndex()).resolves.toEqual(sampleIndex);
    await expect(storage.readSearchIndex()).resolves.toEqual(sampleSearchIndex);
    expect(putMock).toHaveBeenCalledWith(
      'feishu-blog/index.json',
      JSON.stringify(sampleIndex, null, 2),
      expect.objectContaining({
        allowOverwrite: true,
        contentType: 'application/json',
      }),
    );
    expect(putMock).toHaveBeenCalledWith(
      'feishu-blog/search-index.json',
      JSON.stringify(sampleSearchIndex, null, 2),
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

  it('deletes blob articles by slug', async () => {
    const { del } = await import('@vercel/blob');
    const delMock = jest.mocked(del);

    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.deleteArticle('old-title');

    expect(delMock).toHaveBeenCalledWith('feishu-blog/articles/old-title.json');
  });
});
