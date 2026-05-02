import { Article, BlogSyncState } from '@/common/types/blog';

const REQUIRED_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_SPACE_ID',
] as const;

const article: Article = {
  id: 'node-1',
  slug: 'existing-doc',
  title: 'Existing Doc',
  summary: 'Existing content',
  cover: '/images/blog-cover-personal.svg',
  publishedAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  tags: [],
  featured: false,
  draft: false,
  readingTimeMinutes: 1,
  sourceNodeToken: 'node-1',
  sourceDocumentId: 'doc-1',
  content: 'Existing content',
  contentFormat: 'markdown',
};

const previousSyncState: BlogSyncState = {
  generatedAt: '2026-04-20T00:00:00.000Z',
  source: 'feishu',
  documents: {
    'node-1': {
      slug: 'existing-doc',
      sourceDocumentId: 'doc-1',
      objEditTime: '1776561839',
      revisionId: 'rev-1',
      coverToken: 'cover-1',
      assetTokens: ['img-existing'],
    },
    'node-removed': {
      slug: 'removed-doc',
      sourceDocumentId: 'doc-removed',
      objEditTime: '1776561800',
      revisionId: 'rev-removed',
      assetTokens: [],
    },
  },
  assets: {
    'img-existing': {
      pathname: 'image/img-existing.png',
      url: '/local-feishu-assets/image/img-existing.png',
      contentType: 'image/png',
      updatedAt: '2026-04-20T00:00:00.000Z',
    },
  },
};

const node = {
  title: 'Existing Doc',
  node_token: 'node-1',
  space_id: 'space-1',
  obj_type: 'docx',
  obj_token: 'doc-1',
  obj_create_time: '1776438597',
  obj_edit_time: '1776561839',
};

type StorageMock = {
  name: 'local';
  readIndex: jest.Mock;
  writeIndex: jest.Mock;
  readArticle: jest.Mock;
  writeArticle: jest.Mock;
  readSyncState: jest.Mock;
  writeSyncState: jest.Mock;
  assetExists: jest.Mock;
  writeAsset: jest.Mock;
  deleteAsset: jest.Mock;
};

const createStorageMock = (): StorageMock => ({
  name: 'local',
  readIndex: jest.fn(),
  writeIndex: jest.fn(),
  readArticle: jest.fn(),
  writeArticle: jest.fn(),
  readSyncState: jest.fn(),
  writeSyncState: jest.fn(),
  assetExists: jest.fn(),
  writeAsset: jest.fn(),
  deleteAsset: jest.fn(),
});

const mockFeishuDocxRenderer = () => {
  jest.doMock('feishu-docx/dist/index.js', () => ({
    MarkdownRenderer: class MarkdownRenderer {
      fileTokens: Record<string, { token: string; type: string }>;
      meta: Record<string, unknown>;
      private readonly markdown: string;

      constructor({ blocks }: { blocks: Record<string, unknown>[] }) {
        this.markdown = String(blocks[0]?.markdown || '');
        this.fileTokens =
          (blocks[0]?.fileTokens as Record<
            string,
            { token: string; type: string }
          >) || {};
        this.meta = (blocks[0]?.meta as Record<string, unknown>) || {};
      }

      parse() {
        return this.markdown;
      }
    },
  }));
};

const setupSyncMocks = ({
  storage,
  client,
}: {
  storage: StorageMock;
  client: Record<string, jest.Mock>;
}) => {
  jest.doMock('@/server/blog/storage', () => ({
    getBlogStorage: () => storage,
  }));
  jest.doMock('@/server/blog/feishu', () => ({
    FeishuClient: jest.fn(() => client),
  }));
  mockFeishuDocxRenderer();
};

describe('syncFeishuArticles', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFeishuDocxRenderer();
    process.env = {
      ...originalEnv,
      FEISHU_APP_ID: 'app-id',
      FEISHU_APP_SECRET: 'app-secret',
      FEISHU_SPACE_ID: 'space-1',
    };
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.dontMock('@/server/blog/storage');
    jest.dontMock('@/server/blog/feishu');
    jest.dontMock('feishu-docx/dist/index.js');
  });

  it('skips gracefully when credentials are missing in optional mode', async () => {
    REQUIRED_KEYS.forEach((key) => {
      delete process.env[key];
    });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles({ optional: true });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('Missing env');
  });

  it('uses document create time as publishedAt when frontmatter date is missing', async () => {
    const { resolveArticleDates } = await import('@/server/blog/sync');
    const result = resolveArticleDates(undefined, {
      obj_create_time: '1776438597',
      obj_edit_time: '1776561839',
    });

    expect(result.publishedAt).toBe('2026-04-17T15:09:57.000Z');
    expect(result.updatedAt).toBe('2026-04-19T01:23:59.000Z');
  });

  it('prefers frontmatter date over document timestamps for publishedAt', async () => {
    const { resolveArticleDates } = await import('@/server/blog/sync');
    const result = resolveArticleDates('2026-04-01', {
      obj_create_time: '1776438597',
      obj_edit_time: '1776561839',
    });

    expect(result.publishedAt).toBe('2026-04-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-04-19T01:23:59.000Z');
  });

  it('builds token-stable asset paths even when file names collide', async () => {
    const { buildAssetPath } = await import('@/server/blog/sync');
    const firstPath = buildAssetPath({
      fileToken: {
        token: 'img-first',
        type: 'image',
      },
      contentType: 'image/png',
      originalName: 'image.png',
    });
    const secondPath = buildAssetPath({
      fileToken: {
        token: 'img-second',
        type: 'image',
      },
      contentType: 'image/png',
      originalName: 'image.png',
    });

    expect(firstPath).toBe('image/img-first-image.png');
    expect(secondPath).toBe('image/img-second-image.png');
    expect(firstPath).not.toBe(secondPath);
  });

  it('reuses unchanged articles and removes missing nodes from the next state', async () => {
    const storage = createStorageMock();
    const client = {
      listDocNodesBySpace: jest.fn().mockResolvedValue([node]),
      getNode: jest.fn().mockResolvedValue(node),
      getDocumentInfo: jest.fn().mockResolvedValue({
        title: 'Existing Doc',
        revision_id: 'rev-1',
        cover: { token: 'cover-1' },
      }),
      getDocumentBlocks: jest.fn(),
      downloadAsset: jest.fn(),
    };
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);
    setupSyncMocks({ storage, client });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles();

    expect(client.getDocumentBlocks).not.toHaveBeenCalled();
    expect(client.downloadAsset).not.toHaveBeenCalled();
    expect(storage.writeArticle).not.toHaveBeenCalled();
    expect(result.reusedArticles).toBe(1);
    expect(result.changedArticles).toBe(0);
    expect(result.fallbackArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [expect.objectContaining({ slug: 'existing-doc' })],
      }),
    );
    expect(storage.writeSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: expect.not.objectContaining({
          'node-removed': expect.anything(),
        }),
      }),
    );
  });

  it('falls back to the previous article when a changed document fails to refresh', async () => {
    const storage = createStorageMock();
    const client = {
      listDocNodesBySpace: jest.fn().mockResolvedValue([node]),
      getNode: jest.fn().mockResolvedValue({
        ...node,
        obj_edit_time: '1776561900',
      }),
      getDocumentInfo: jest.fn().mockResolvedValue({
        title: 'Updated Doc',
        revision_id: 'rev-2',
        cover: { token: 'cover-1' },
      }),
      getDocumentBlocks: jest.fn().mockRejectedValue(new Error('temporary')),
      downloadAsset: jest.fn(),
    };
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);
    setupSyncMocks({ storage, client });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles();

    expect(client.getDocumentBlocks).toHaveBeenCalledWith('doc-1');
    expect(storage.writeArticle).not.toHaveBeenCalled();
    expect(result.changedArticles).toBe(0);
    expect(result.fallbackArticles).toBe(1);
    expect(result.reusedArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [expect.objectContaining({ slug: 'existing-doc' })],
      }),
    );
    expect(storage.writeSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: {
          'node-1': expect.objectContaining({
            slug: 'existing-doc',
            revisionId: 'rev-1',
            objEditTime: '1776561839',
          }),
        },
      }),
    );
  });

  it('rebuilds changed articles while reusing known assets and downloading new ones', async () => {
    const storage = createStorageMock();
    const client = {
      listDocNodesBySpace: jest.fn().mockResolvedValue([node]),
      getNode: jest.fn().mockResolvedValue({
        ...node,
        obj_edit_time: '1776561900',
      }),
      getDocumentInfo: jest.fn().mockResolvedValue({
        title: 'Updated Doc',
        revision_id: 'rev-2',
      }),
      getDocumentBlocks: jest.fn().mockResolvedValue([
        {
          markdown: [
            '---',
            'title: Updated Doc',
            'tags: Test',
            '---',
            '# Updated Doc',
            '![existing](img-existing)',
            '![new](img-new)',
            'Body',
          ].join('\n'),
          fileTokens: {
            'img-existing': { token: 'img-existing', type: 'image' },
            'img-new': { token: 'img-new', type: 'image' },
          },
          meta: {},
        },
      ]),
      downloadAsset: jest.fn().mockResolvedValue({
        body: Buffer.from('new-asset'),
        contentType: 'image/png',
        contentDisposition: null,
      }),
    };
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.assetExists.mockImplementation((pathname) =>
      Promise.resolve(pathname === 'image/img-existing.png'),
    );
    storage.writeAsset.mockResolvedValue(
      '/local-feishu-assets/image/img-new.png',
    );
    setupSyncMocks({ storage, client });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles();

    expect(client.getDocumentBlocks).toHaveBeenCalledWith('doc-1');
    expect(client.downloadAsset).toHaveBeenCalledTimes(1);
    expect(storage.writeAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: 'image/img-new.png',
      }),
    );
    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'updated-doc',
        title: 'Updated Doc',
        content: expect.stringContaining(
          '/local-feishu-assets/image/img-existing.png',
        ),
      }),
    );
    expect(result.changedArticles).toBe(1);
    expect(result.fallbackArticles).toBe(0);
    expect(result.downloadedAssets).toBe(1);
    expect(result.reusedAssets).toBe(1);
    expect(storage.writeSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: {
          'node-1': expect.objectContaining({
            slug: 'updated-doc',
            revisionId: 'rev-2',
            assetTokens: ['img-existing', 'img-new'],
          }),
        },
        assets: expect.objectContaining({
          'img-existing': previousSyncState.assets['img-existing'],
          'img-new': expect.objectContaining({
            pathname: 'image/img-new.png',
            url: '/local-feishu-assets/image/img-new.png',
          }),
        }),
      }),
    );
  });

  it('prunes unused asset state and deletes stale asset files', async () => {
    const storage = createStorageMock();
    const staleSyncState: BlogSyncState = {
      ...previousSyncState,
      assets: {
        ...previousSyncState.assets,
        'img-stale': {
          pathname: 'image/img-stale.png',
          url: '/local-feishu-assets/image/img-stale.png',
          contentType: 'image/png',
          updatedAt: '2026-04-20T00:00:00.000Z',
        },
      },
    };
    const client = {
      listDocNodesBySpace: jest.fn().mockResolvedValue([node]),
      getNode: jest.fn().mockResolvedValue(node),
      getDocumentInfo: jest.fn().mockResolvedValue({
        title: 'Existing Doc',
        revision_id: 'rev-1',
        cover: { token: 'cover-1' },
      }),
      getDocumentBlocks: jest.fn(),
      downloadAsset: jest.fn(),
    };
    storage.readSyncState.mockResolvedValue(staleSyncState);
    storage.readArticle.mockResolvedValue(article);
    setupSyncMocks({ storage, client });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles();

    expect(storage.deleteAsset).toHaveBeenCalledWith('image/img-stale.png');
    expect(result.deletedAssets).toBe(1);
    expect(result.failedAssetDeletes).toBe(0);
    expect(storage.writeSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: {
          'img-existing': previousSyncState.assets['img-existing'],
        },
      }),
    );
  });

  it('keeps stale asset metadata when physical deletion fails', async () => {
    const storage = createStorageMock();
    const staleSyncState: BlogSyncState = {
      ...previousSyncState,
      assets: {
        ...previousSyncState.assets,
        'img-stale': {
          pathname: 'image/img-stale.png',
          url: '/local-feishu-assets/image/img-stale.png',
          contentType: 'image/png',
          updatedAt: '2026-04-20T00:00:00.000Z',
        },
      },
    };
    const client = {
      listDocNodesBySpace: jest.fn().mockResolvedValue([node]),
      getNode: jest.fn().mockResolvedValue(node),
      getDocumentInfo: jest.fn().mockResolvedValue({
        title: 'Existing Doc',
        revision_id: 'rev-1',
        cover: { token: 'cover-1' },
      }),
      getDocumentBlocks: jest.fn(),
      downloadAsset: jest.fn(),
    };
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.readSyncState.mockResolvedValue(staleSyncState);
    storage.readArticle.mockResolvedValue(article);
    storage.deleteAsset.mockRejectedValue(new Error('delete failed'));
    setupSyncMocks({ storage, client });

    const { syncFeishuArticles } = await import('@/server/blog/sync');
    const result = await syncFeishuArticles();

    expect(result.deletedAssets).toBe(0);
    expect(result.failedAssetDeletes).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to delete unused asset image/img-stale.png',
      expect.any(Error),
    );
    expect(storage.writeSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: {
          'img-existing': previousSyncState.assets['img-existing'],
          'img-stale': staleSyncState.assets['img-stale'],
        },
      }),
    );
  });
});
