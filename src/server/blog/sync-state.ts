export type BlogSyncAssetState = {
  pathname: string;
  url: string;
  contentType?: string | null;
  updatedAt: string;
};

export type BlogSyncDocumentState = {
  slug: string;
  sourceDocumentId: string;
  contentVersion?: number;
  objEditTime?: string;
  revisionId?: string;
  coverToken?: string;
  assetTokens: string[];
};

export type BlogSyncState = {
  generatedAt: string;
  source: 'feishu';
  documents: Record<string, BlogSyncDocumentState>;
  assets: Record<string, BlogSyncAssetState>;
};
