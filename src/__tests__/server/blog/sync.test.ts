import { Article } from '@/common/types/blog';
import {
  ArticleSourceAdapter,
  SourceDocument,
  SourceDocumentRevision,
} from '@/server/blog/source';
import {
  ArticleSyncPublicationAdapter,
  createFeishuArticleSync,
  syncFeishuArticles,
} from '@/server/blog/sync';
import { BlogSyncState } from '@/server/blog/sync-state';

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

const document: SourceDocument = {
  title: 'Existing Doc',
  sourceNodeToken: 'node-1',
  sourceSpaceId: 'space-1',
  sourceDocumentId: 'doc-1',
  createdAt: '1776438597',
  updatedAt: '1776561839',
};

const revision: SourceDocumentRevision = {
  ...document,
  revisionId: 'rev-1',
  coverToken: 'cover-1',
};

type StorageMock = jest.Mocked<ArticleSyncPublicationAdapter>;

const createStorageMock = (): StorageMock => ({
  name: 'local',
  readIndex: jest.fn(),
  writeIndex: jest.fn(),
  writeSearchIndex: jest.fn(),
  readArticle: jest.fn(),
  writeArticle: jest.fn(),
  deleteArticle: jest.fn(),
  readSyncState: jest.fn(),
  writeSyncState: jest.fn(),
  assetExists: jest.fn(),
  writeAsset: jest.fn(),
  deleteAsset: jest.fn(),
});

type SourceMock = jest.Mocked<ArticleSourceAdapter>;

const createSourceMock = (): SourceMock => ({
  listDocuments: jest.fn().mockResolvedValue([document]),
  inspectDocument: jest.fn().mockResolvedValue(revision),
  readDocument: jest.fn(),
  downloadAsset: jest.fn(),
});

const createTestSync = (source: SourceMock, publication: StorageMock) =>
  createFeishuArticleSync(() => ({
    availability: 'ready',
    source,
    publication,
  }));

describe('createFeishuArticleSync', () => {
  it('resolves bindings lazily and skips missing configuration without I/O', async () => {
    const publication = createStorageMock();
    const resolveBindings = jest.fn(() => ({
      availability: 'missing-config' as const,
      missingKeys: ['FEISHU_APP_ID'],
      publication,
    }));
    const runSync = createFeishuArticleSync(resolveBindings);

    expect(resolveBindings).not.toHaveBeenCalled();

    await expect(runSync({ optional: true })).resolves.toEqual({
      skipped: true,
      reason: 'Missing env: FEISHU_APP_ID',
      storage: 'local',
    });
    expect(resolveBindings).toHaveBeenCalledTimes(1);
    expect(publication.readSyncState).not.toHaveBeenCalled();
  });

  it('rejects missing configuration in required mode', async () => {
    const publication = createStorageMock();
    const runSync = createFeishuArticleSync(() => ({
      availability: 'missing-config',
      missingKeys: ['FEISHU_APP_SECRET'],
      publication,
    }));

    await expect(runSync()).rejects.toThrow(
      'Missing Feishu env vars: FEISHU_APP_SECRET',
    );
    expect(publication.readSyncState).not.toHaveBeenCalled();
  });
});

describe('syncFeishuArticles', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('skips gracefully when credentials are missing in optional mode', async () => {
    REQUIRED_KEYS.forEach((key) => {
      delete process.env[key];
    });

    const result = await syncFeishuArticles({ optional: true });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('Missing env');
  });

  it('derives Article dates through the sync interface', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const datedDocument: SourceDocument = {
      ...document,
      title: 'Dated Doc',
      sourceNodeToken: 'node-2',
      sourceDocumentId: 'doc-2',
    };
    const stringDatedDocument: SourceDocument = {
      ...document,
      title: 'String dated Doc',
      sourceNodeToken: 'node-3',
      sourceDocumentId: 'doc-3',
    };
    source.listDocuments.mockResolvedValue([
      document,
      datedDocument,
      stringDatedDocument,
    ]);
    source.inspectDocument.mockImplementation(async (item) => ({
      ...item,
      revisionId: `revision-${item.sourceNodeToken}`,
    }));
    source.readDocument.mockImplementation(async (item) => ({
      markdown:
        item.sourceNodeToken === 'node-2'
          ? ['---', 'date: 2026-04-01', '---', '# Dated Doc'].join('\n')
          : item.sourceNodeToken === 'node-3'
            ? '# String dated Doc'
            : '# Existing Doc',
      fileTokens: {},
      meta: item.sourceNodeToken === 'node-3' ? { date: '2026-03-01' } : {},
    }));

    await createTestSync(source, storage)();

    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceNodeToken: 'node-1',
        publishedAt: '2026-04-17T15:09:57.000Z',
        updatedAt: '2026-04-19T01:23:59.000Z',
      }),
    );
    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceNodeToken: 'node-2',
        publishedAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-19T01:23:59.000Z',
      }),
    );
    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceNodeToken: 'node-3',
        publishedAt: '2026-03-01T00:00:00.000Z',
      }),
    );
  });

  it('parses frontmatter after the renderer-generated heading', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    source.inspectDocument.mockResolvedValue({
      ...revision,
      coverToken: undefined,
    });
    source.readDocument.mockResolvedValue({
      markdown: [
        '# Existing Doc',
        '',
        '---',
        'date: 2023-05-10',
        'tags: [CSS, 技術分享]',
        '---',
        '',
        'Body',
      ].join('\n'),
      fileTokens: {},
      meta: {},
    });

    await createTestSync(source, storage)();

    const syncedArticle = storage.writeArticle.mock.calls[0]?.[0];
    expect(syncedArticle).toEqual(
      expect.objectContaining({
        publishedAt: '2023-05-10T00:00:00.000Z',
        content: 'Body',
      }),
    );
    expect(syncedArticle?.tags.map((tag) => tag.name)).toEqual([
      'CSS',
      '技術分享',
    ]);
  });

  it('keeps wiki-hidden documents as drafts when the document title is public', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const hiddenDocument: SourceDocument = {
      ...document,
      title: '[hide] Secret',
    };
    source.listDocuments.mockResolvedValue([hiddenDocument]);
    source.inspectDocument.mockResolvedValue({
      ...hiddenDocument,
      documentTitle: 'Secret',
      revisionId: 'rev-hidden',
    });
    source.readDocument.mockResolvedValue({
      markdown: '# Secret\n\nPrivate content',
      fileTokens: {},
      meta: {},
    });

    await createTestSync(source, storage)();

    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Secret',
        draft: true,
      }),
    );
  });

  it('keeps asset paths token-stable when source file names collide', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    source.readDocument.mockResolvedValue({
      markdown: '# Existing Doc',
      fileTokens: {
        'img-first': { token: 'img-first', type: 'image' },
        'img-second': { token: 'img-second', type: 'image' },
      },
      meta: {},
    });
    source.downloadAsset.mockResolvedValue({
      body: Buffer.from('image'),
      contentType: 'image/png',
      contentDisposition: 'attachment; filename="image.png"',
    });
    storage.assetExists.mockResolvedValue(false);
    storage.writeAsset.mockImplementation(async ({ pathname }) => pathname);

    await createTestSync(source, storage)();

    expect(storage.writeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'image/img-first-image.png' }),
    );
    expect(storage.writeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'image/img-second-image.png' }),
    );
  });

  it('reuses unchanged articles and removes missing nodes from the next state', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);

    const result = await createTestSync(source, storage)();

    expect(source.readDocument).not.toHaveBeenCalled();
    expect(source.downloadAsset).not.toHaveBeenCalled();
    expect(storage.writeArticle).not.toHaveBeenCalled();
    expect(result.reusedArticles).toBe(1);
    expect(result.changedArticles).toBe(0);
    expect(result.fallbackArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [expect.objectContaining({ slug: 'existing-doc' })],
      }),
    );
    expect(storage.writeSearchIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [
          expect.objectContaining({
            slug: 'existing-doc',
            bodyText: 'Existing content',
            searchableText: expect.stringContaining('existing content'),
          }),
        ],
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

  it('reuses an unchanged Article when only the source edit time is available', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const stateWithoutRevision: BlogSyncState = {
      ...previousSyncState,
      documents: {
        'node-1': {
          ...previousSyncState.documents['node-1'],
          revisionId: undefined,
        },
      },
    };
    source.inspectDocument.mockResolvedValue({
      ...revision,
      revisionId: undefined,
    });
    storage.readSyncState.mockResolvedValue(stateWithoutRevision);
    storage.readArticle.mockResolvedValue(article);

    const result = await createTestSync(source, storage)();

    expect(source.readDocument).not.toHaveBeenCalled();
    expect(result.reusedArticles).toBe(1);
  });

  it('falls back to the previous article when a changed document fails to refresh', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    source.inspectDocument.mockResolvedValue({
      ...revision,
      title: 'Updated Doc',
      updatedAt: '1776561900',
      revisionId: 'rev-2',
    });
    source.readDocument.mockRejectedValue(new Error('temporary'));
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);

    const result = await createTestSync(source, storage)();

    expect(source.readDocument).toHaveBeenCalledWith(
      expect.objectContaining({ sourceDocumentId: 'doc-1' }),
    );
    expect(storage.writeArticle).not.toHaveBeenCalled();
    expect(result.changedArticles).toBe(0);
    expect(result.fallbackArticles).toBe(1);
    expect(result.reusedArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [expect.objectContaining({ slug: 'existing-doc' })],
      }),
    );
    expect(storage.writeSearchIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [
          expect.objectContaining({
            slug: 'existing-doc',
            bodyText: 'Existing content',
          }),
        ],
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
    errorSpy.mockRestore();
  });

  it('does not reuse previous-slug JSON that belongs to another Source Document', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    source.inspectDocument.mockResolvedValue({
      ...revision,
      updatedAt: '1776561900',
      revisionId: 'rev-2',
    });
    source.readDocument.mockRejectedValue(new Error('temporary'));
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue({
      ...article,
      sourceNodeToken: 'node-other',
    });

    const result = await createTestSync(source, storage)();

    expect(result.totalArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({ articles: [] }),
    );
    errorSpy.mockRestore();
  });

  it('retains the previous Article when source inspection fails', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    source.inspectDocument.mockRejectedValue(new Error('temporary'));
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);

    const result = await createTestSync(source, storage)();

    expect(source.readDocument).not.toHaveBeenCalled();
    expect(result.fallbackArticles).toBe(1);
    expect(result.totalArticles).toBe(1);
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
    errorSpy.mockRestore();
  });

  it('omits failed Source Documents that have no usable previous Article', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const newDocument: SourceDocument = {
      ...document,
      sourceNodeToken: 'node-new',
      sourceDocumentId: 'doc-new',
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    source.listDocuments.mockResolvedValue([document, newDocument]);
    source.inspectDocument.mockRejectedValue(new Error('temporary'));
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(null);

    const result = await createTestSync(source, storage)();

    expect(result.totalArticles).toBe(0);
    expect(result.fallbackArticles).toBe(0);
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({ articles: [] }),
    );
    errorSpy.mockRestore();
  });

  it('does not publish when a previous Article cannot be read', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    const readError = new Error('storage unavailable');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockRejectedValue(readError);

    await expect(createTestSync(source, storage)()).rejects.toBe(readError);
    expect(storage.writeIndex).not.toHaveBeenCalled();
    expect(storage.writeSearchIndex).not.toHaveBeenCalled();
    expect(storage.writeSyncState).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('rebuilds changed articles while reusing known assets and downloading new ones', async () => {
    const storage = createStorageMock();
    storage.readIndex.mockResolvedValue({
      generatedAt: '2026-04-20T00:00:00.000Z',
      source: 'feishu',
      articles: [article],
      redirects: {
        'legacy-doc': {
          sourceNodeToken: 'node-1',
          targetSlug: 'existing-doc',
        },
      },
    });
    const source = createSourceMock();
    source.inspectDocument.mockResolvedValue({
      ...revision,
      title: 'Updated Doc',
      updatedAt: '1776561900',
      revisionId: 'rev-2',
      coverToken: undefined,
    });
    source.readDocument.mockResolvedValue({
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
    });
    source.downloadAsset.mockResolvedValue({
      body: Buffer.from('new-asset'),
      contentType: 'image/png',
      contentDisposition: null,
    });
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.assetExists.mockImplementation((pathname) =>
      Promise.resolve(pathname === 'image/img-existing.png'),
    );
    storage.writeAsset.mockResolvedValue(
      '/local-feishu-assets/image/img-new.png',
    );

    const result = await createTestSync(source, storage)();

    expect(source.readDocument).toHaveBeenCalledWith(
      expect.objectContaining({ sourceDocumentId: 'doc-1' }),
    );
    expect(source.downloadAsset).toHaveBeenCalledTimes(1);
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
    expect(storage.writeSearchIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: [
          expect.objectContaining({
            slug: 'updated-doc',
            bodyText: expect.stringContaining('Body'),
            searchableText: expect.stringContaining('updated doc'),
          }),
        ],
      }),
    );
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        redirects: {
          'existing-doc': {
            sourceNodeToken: 'node-1',
            targetSlug: 'updated-doc',
          },
          'legacy-doc': {
            sourceNodeToken: 'node-1',
            targetSlug: 'updated-doc',
          },
        },
      }),
    );
    expect(storage.deleteArticle).toHaveBeenCalledWith('existing-doc');
    expect(storage.deleteArticle).toHaveBeenCalledWith('legacy-doc');
    expect(storage.writeIndex.mock.invocationCallOrder[0]).toBeLessThan(
      storage.deleteArticle.mock.invocationCallOrder[0],
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

  it('recovers the previous slug from the index when sync state is missing', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    storage.readIndex.mockResolvedValue({
      generatedAt: '2026-04-20T00:00:00.000Z',
      source: 'feishu',
      articles: [article],
    });
    storage.readSyncState.mockResolvedValue(null);
    storage.readArticle.mockResolvedValue(article);
    source.inspectDocument.mockResolvedValue({
      ...revision,
      title: 'Updated Doc',
      updatedAt: '1776561900',
      revisionId: 'rev-2',
      coverToken: undefined,
    });
    source.readDocument.mockResolvedValue({
      markdown: ['---', 'title: Updated Doc', '---', '# Updated Doc'].join(
        '\n',
      ),
      fileTokens: {},
      meta: {},
    });

    await createTestSync(source, storage)();

    expect(storage.readArticle).toHaveBeenCalledWith('existing-doc');
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        redirects: {
          'existing-doc': {
            sourceNodeToken: 'node-1',
            targetSlug: 'updated-doc',
          },
        },
      }),
    );
    expect(storage.deleteArticle).toHaveBeenCalledWith('existing-doc');
  });

  it('never reuses a permanent alias as an active Article slug', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
    storage.readIndex.mockResolvedValue({
      generatedAt: '2026-04-20T00:00:00.000Z',
      source: 'feishu',
      articles: [article],
      redirects: {
        'legacy-doc': {
          sourceNodeToken: 'node-1',
          targetSlug: 'existing-doc',
        },
      },
    });
    storage.readSyncState.mockResolvedValue(previousSyncState);
    storage.readArticle.mockResolvedValue(article);
    source.inspectDocument.mockResolvedValue({
      ...revision,
      updatedAt: '1776561900',
      revisionId: 'rev-2',
      coverToken: undefined,
    });
    source.readDocument.mockResolvedValue({
      markdown: ['---', 'slug: legacy-doc', '---', '# Existing Doc'].join('\n'),
      fileTokens: {},
      meta: {},
    });

    await createTestSync(source, storage)();

    expect(storage.writeArticle).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'legacy-doc-node-1' }),
    );
    expect(storage.writeIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        redirects: {
          'existing-doc': {
            sourceNodeToken: 'node-1',
            targetSlug: 'legacy-doc-node-1',
          },
          'legacy-doc': {
            sourceNodeToken: 'node-1',
            targetSlug: 'legacy-doc-node-1',
          },
        },
      }),
    );
  });

  it('prunes unused asset state and deletes stale asset files', async () => {
    const storage = createStorageMock();
    const source = createSourceMock();
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
    storage.readSyncState.mockResolvedValue(staleSyncState);
    storage.readArticle.mockResolvedValue(article);

    const result = await createTestSync(source, storage)();

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
    const source = createSourceMock();
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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.readSyncState.mockResolvedValue(staleSyncState);
    storage.readArticle.mockResolvedValue(article);
    storage.deleteAsset.mockRejectedValue(new Error('delete failed'));

    const result = await createTestSync(source, storage)();

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
    warnSpy.mockRestore();
  });
});
