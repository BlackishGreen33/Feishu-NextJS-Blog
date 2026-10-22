import { MarkdownRenderer } from 'feishu-docx/dist/index.js';

import { getServerEnv } from '@/server/env';

import { FeishuClient, FeishuWikiNode } from './feishu';
import { feishuSourceConfigSchema } from './feishu-schema';

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

const toSourceDocument = (node: FeishuWikiNode): SourceDocument => {
  const createdAt = normalizeOptionalString(node.obj_create_time);
  const updatedAt = normalizeOptionalString(node.obj_edit_time);
  return {
    title: node.title,
    sourceNodeToken: node.node_token,
    sourceDocumentId: node.obj_token,
    sourceSpaceId: node.space_id,
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
  };
};

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

      const documentTitle = documentInfo?.title;
      const revisionId = normalizeOptionalString(
        documentInfo?.revision_id ?? documentInfo?.latest_revision_id,
      );
      const coverToken = documentInfo?.cover?.token;
      return {
        ...latestDocument,
        ...(documentTitle === undefined ? {} : { documentTitle }),
        ...(revisionId === undefined ? {} : { revisionId }),
        ...(coverToken === undefined ? {} : { coverToken }),
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

export const resolveFeishuArticleSource = () => {
  const {
    feishu: { appId, appSecret, spaceId },
  } = getServerEnv();
  const missingKeys = [
    ...(!appId ? ['FEISHU_APP_ID'] : []),
    ...(!appSecret ? ['FEISHU_APP_SECRET'] : []),
    ...(!spaceId ? ['FEISHU_SPACE_ID'] : []),
  ];

  if (missingKeys.length > 0) {
    return {
      availability: 'missing-config' as const,
      missingKeys,
    };
  }

  return {
    availability: 'ready' as const,
    source: createFeishuArticleSource(
      feishuSourceConfigSchema.parse({ appId, appSecret, spaceId }),
    ),
  };
};
