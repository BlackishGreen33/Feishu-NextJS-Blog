import { z } from 'zod';

export const blogSyncAssetStateSchema = z.looseObject({
  pathname: z.string(),
  url: z.string(),
  contentType: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export const blogSyncDocumentStateSchema = z.looseObject({
  slug: z.string(),
  sourceDocumentId: z.string(),
  contentVersion: z.number().optional(),
  objEditTime: z.string().optional(),
  revisionId: z.string().optional(),
  coverToken: z.string().optional(),
  assetTokens: z.array(z.string()),
});

export const blogSyncStateSchema = z.looseObject({
  generatedAt: z.string(),
  source: z.literal('feishu'),
  documents: z.record(z.string(), blogSyncDocumentStateSchema),
  assets: z.record(z.string(), blogSyncAssetStateSchema),
});

export type BlogSyncAssetState = z.infer<typeof blogSyncAssetStateSchema>;
export type BlogSyncDocumentState = z.infer<typeof blogSyncDocumentStateSchema>;
export type BlogSyncState = z.infer<typeof blogSyncStateSchema>;
