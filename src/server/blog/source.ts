import { MarkdownRenderer } from 'feishu-docx/dist/index.js';

import { FeishuClient, FeishuWikiNode } from './feishu';

export type SourceAsset = {
  token: string;
  type: 'file' | 'image' | 'board';
};

export type SourceDocument = {
  title: string;
  sourceNodeToken: string;
  sourceDocumentId: string;
  sourceSpaceId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SourceDocumentRevision = SourceDocument & {
  documentTitle?: string;
  revisionId?: string;
  coverToken?: string;
};

export type SourceDocumentContent = {
  markdown: string;
  fileTokens: Record<string, SourceAsset>;
  meta: Record<string, unknown>;
};

export interface ArticleSourceAdapter {
  listDocuments: () => Promise<SourceDocument[]>;
  inspectDocument: (
    document: SourceDocument,
  ) => Promise<SourceDocumentRevision>;
  readDocument: (
    document: SourceDocumentRevision,
  ) => Promise<SourceDocumentContent>;
  downloadAsset: (asset: SourceAsset) => Promise<{
    body: Buffer;
    contentType: string | null;
    contentDisposition: string | null;
  }>;
}

type FeishuArticleSourceOptions = {
  appId: string;
  appSecret: string;
  spaceId: string;
};

const normalizeOptionalString = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
};

const toSourceDocument = (node: FeishuWikiNode): SourceDocument => ({
  title: node.title,
  sourceNodeToken: node.node_token,
  sourceDocumentId: node.obj_token,
  sourceSpaceId: node.space_id,
  createdAt: normalizeOptionalString(node.obj_create_time),
  updatedAt: normalizeOptionalString(node.obj_edit_time),
});

export const createFeishuArticleSource = ({
  appId,
  appSecret,
  spaceId,
}: FeishuArticleSourceOptions): ArticleSourceAdapter => {
  const client = new FeishuClient(appId, appSecret);

  return {
    async listDocuments() {
      return (await client.listDocNodesBySpace(spaceId)).map(toSourceDocument);
    },

    async inspectDocument(document) {
      const latestNode = await client.getNode(
        document.sourceSpaceId,
        document.sourceNodeToken,
      );
      const latestDocument = latestNode
        ? toSourceDocument(latestNode)
        : document;
      const documentInfo = await client.getDocumentInfo(
        latestDocument.sourceDocumentId,
      );

      return {
        ...latestDocument,
        documentTitle: documentInfo?.title,
        revisionId: normalizeOptionalString(
          documentInfo?.revision_id ?? documentInfo?.latest_revision_id,
        ),
        coverToken: documentInfo?.cover?.token,
      };
    },

    async readDocument(document) {
      const blocks = await client.getDocumentBlocks(document.sourceDocumentId);
      const renderer = new MarkdownRenderer({
        document: { document_id: document.sourceDocumentId },
        blocks,
      });

      return {
        markdown: renderer.parse(),
        fileTokens: renderer.fileTokens,
        meta: renderer.meta || {},
      };
    },

    downloadAsset(asset) {
      return client.downloadAsset(asset);
    },
  };
};
