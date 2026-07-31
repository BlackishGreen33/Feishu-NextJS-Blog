const mockClient = {
  listDocNodesBySpace: jest.fn(),
  getNode: jest.fn(),
  getDocumentInfo: jest.fn(),
  getDocumentBlocks: jest.fn(),
  downloadAsset: jest.fn(),
};

jest.mock('@/server/blog/feishu', () => ({
  FeishuClient: jest.fn(() => mockClient),
}));

jest.mock('feishu-docx/dist/index.js', () => ({
  MarkdownRenderer: class MarkdownRenderer {
    fileTokens: Record<string, { token: string; type: 'image' }>;
    meta: Record<string, unknown>;
    private readonly markdown: string;

    constructor({ blocks }: { blocks: Record<string, unknown>[] }) {
      this.markdown = String(blocks[0]?.markdown || '');
      this.fileTokens =
        (blocks[0]?.fileTokens as Record<
          string,
          { token: string; type: 'image' }
        >) || {};
      this.meta = (blocks[0]?.meta as Record<string, unknown>) || {};
    }

    parse() {
      return this.markdown;
    }
  },
}));

import { createFeishuArticleSource } from '@/server/blog/source';

describe('createFeishuArticleSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes Feishu transport data behind the Source interface', async () => {
    const rawNode = {
      title: 'Original title',
      node_token: 'node-1',
      space_id: 'space-1',
      obj_type: 'docx',
      obj_token: 'doc-1',
      obj_create_time: 1776438597,
      obj_edit_time: 1776561839,
    };
    const latestNode = {
      ...rawNode,
      title: 'Latest node title',
      obj_edit_time: 1776561900,
    };
    mockClient.listDocNodesBySpace.mockResolvedValue([rawNode]);
    mockClient.getNode.mockResolvedValue(latestNode);
    mockClient.getDocumentInfo.mockResolvedValue({
      title: 'Document title',
      revision_id: 42,
      cover: { token: 'cover-1' },
    });
    mockClient.getDocumentBlocks.mockResolvedValue([
      {
        markdown: '# Document title',
        fileTokens: {
          'image-1': { token: 'image-1', type: 'image' },
        },
        meta: { featured: true },
      },
    ]);
    mockClient.downloadAsset.mockResolvedValue({
      body: Buffer.from('image'),
      contentType: 'image/png',
      contentDisposition: null,
    });
    const source = createFeishuArticleSource({
      appId: 'app-id',
      appSecret: 'app-secret',
      spaceId: 'space-1',
    });

    const [document] = await source.listDocuments();
    const revision = await source.inspectDocument(document);
    const content = await source.readDocument(revision);
    const download = await source.downloadAsset({
      token: 'image-1',
      type: 'image',
    });

    expect(mockClient.listDocNodesBySpace).toHaveBeenCalledWith('space-1');
    expect(revision).toEqual({
      title: 'Latest node title',
      documentTitle: 'Document title',
      sourceNodeToken: 'node-1',
      sourceDocumentId: 'doc-1',
      sourceSpaceId: 'space-1',
      createdAt: '1776438597',
      updatedAt: '1776561900',
      revisionId: '42',
      coverToken: 'cover-1',
    });
    expect(content).toEqual({
      markdown: '# Document title',
      fileTokens: {
        'image-1': { token: 'image-1', type: 'image' },
      },
      meta: { featured: true },
    });
    expect(download.contentType).toBe('image/png');
  });

  it('falls back to listed document data when optional Feishu metadata is absent', async () => {
    const rawNode = {
      title: 'Listed title',
      documentTitle: undefined,
      node_token: 'node-2',
      space_id: 'space-1',
      obj_type: 'docx',
      obj_token: 'doc-2',
    };
    mockClient.listDocNodesBySpace.mockResolvedValue([rawNode]);
    mockClient.getNode.mockResolvedValue(null);
    mockClient.getDocumentInfo.mockResolvedValue({ latest_revision_id: 7 });
    mockClient.getDocumentBlocks.mockResolvedValue([{}]);
    const source = createFeishuArticleSource({
      appId: 'app-id',
      appSecret: 'app-secret',
      spaceId: 'space-1',
    });

    const [document] = await source.listDocuments();
    const revision = await source.inspectDocument(document);
    const content = await source.readDocument(revision);

    expect(revision).toEqual({
      title: 'Listed title',
      sourceNodeToken: 'node-2',
      sourceDocumentId: 'doc-2',
      sourceSpaceId: 'space-1',
      createdAt: undefined,
      updatedAt: undefined,
      revisionId: '7',
      coverToken: undefined,
    });
    expect(content).toEqual({
      markdown: '',
      fileTokens: {},
      meta: {},
    });
  });
});
