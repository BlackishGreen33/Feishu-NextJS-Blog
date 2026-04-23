import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { Article, ArticleIndex } from '@/common/types/blog';

jest.mock('@vercel/blob', () => ({
  BlobNotFoundError: class BlobNotFoundError extends Error {},
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
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
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

  it('writes local sync output into ignored cache paths', async () => {
    const { getBlogStorage } = await import('@/server/blog/storage');
    const storage = getBlogStorage();

    await storage.writeIndex(sampleIndex);
    await storage.writeArticle(sampleArticle);
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
      fs.readFile(path.join(tempDir, 'data', 'feishu-blog', 'index.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(assetUrl).toBe('/local-feishu-assets/image/example.png');
  });
});
