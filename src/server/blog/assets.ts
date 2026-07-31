/* eslint-disable no-console */
import { ArticleSourceAdapter, SourceAsset } from './source';
import { BlogStorageAdapter } from './storage';
import { BlogSyncAssetState } from './sync-state';
import {
  extensionFromType,
  mapWithConcurrency,
  parseContentDispositionName,
  sanitizeFileName,
} from './utils';

type AssetPublicationAdapter = Pick<
  BlogStorageAdapter,
  'assetExists' | 'writeAsset' | 'deleteAsset'
>;

type AssetSyncStats = {
  downloadedAssets: number;
  reusedAssets: number;
  deletedAssets: number;
  failedAssetDeletes: number;
};

export interface ArticleAssetManager {
  resolveArticleAssets: (
    fileTokens: Record<string, SourceAsset>,
  ) => Promise<Record<string, string>>;
  resolveCover: (
    token: string,
    resolvedAssets: Record<string, string>,
  ) => Promise<string>;
  pruneUnusedAssets: (
    activeAssetTokens: Set<string>,
  ) => Promise<Record<string, BlogSyncAssetState>>;
  getStats: () => Readonly<AssetSyncStats>;
}

const ASSET_SYNC_CONCURRENCY = 4;

const buildAssetPath = ({
  fileToken,
  contentType,
  originalName,
  directory = fileToken.type,
}: {
  fileToken: SourceAsset;
  contentType: string | null;
  originalName?: string | null;
  directory?: string;
}) => {
  const extension = extensionFromType(contentType, originalName);
  const safeName = sanitizeFileName(
    originalName
      ? `${fileToken.token}-${originalName}`
      : `${fileToken.token}${extension}`,
  );

  return `${directory}/${safeName || `${fileToken.token}${extension}`}`;
};

export const createArticleAssetManager = ({
  publication,
  source,
  initialAssets,
}: {
  publication: AssetPublicationAdapter;
  source: ArticleSourceAdapter;
  initialAssets: Record<string, BlogSyncAssetState>;
}): ArticleAssetManager => {
  let assets = { ...initialAssets };
  let stats: AssetSyncStats = {
    downloadedAssets: 0,
    reusedAssets: 0,
    deletedAssets: 0,
    failedAssetDeletes: 0,
  };
  const inFlightAssets = new Map<string, Promise<BlogSyncAssetState>>();

  const resolveAsset = async (
    fileToken: SourceAsset,
    directory: string = fileToken.type,
  ) => {
    const existing = assets[fileToken.token];

    if (existing && (await publication.assetExists(existing.pathname))) {
      stats = { ...stats, reusedAssets: stats.reusedAssets + 1 };
      return existing;
    }

    const pendingAsset = inFlightAssets.get(fileToken.token);
    if (pendingAsset) return pendingAsset;

    const nextAsset = source.downloadAsset(fileToken).then(async (download) => {
      const originalName = parseContentDispositionName(
        download.contentDisposition,
      );
      const pathname = buildAssetPath({
        fileToken,
        contentType: download.contentType,
        originalName,
        directory,
      });
      const url = await publication.writeAsset({
        body: download.body,
        contentType: download.contentType,
        pathname,
      });
      const asset = {
        pathname,
        url,
        contentType: download.contentType,
        updatedAt: new Date().toISOString(),
      };

      stats = { ...stats, downloadedAssets: stats.downloadedAssets + 1 };
      assets = { ...assets, [fileToken.token]: asset };
      return asset;
    });

    inFlightAssets.set(fileToken.token, nextAsset);

    try {
      return await nextAsset;
    } finally {
      inFlightAssets.delete(fileToken.token);
    }
  };

  return {
    async resolveArticleAssets(fileTokens) {
      const uniqueFileTokens = [
        ...new Map(
          Object.values(fileTokens).map((fileToken) => [
            fileToken.token,
            fileToken,
          ]),
        ).values(),
      ];
      const resolved = await mapWithConcurrency(
        uniqueFileTokens,
        ASSET_SYNC_CONCURRENCY,
        async (fileToken) =>
          [fileToken.token, (await resolveAsset(fileToken)).url] as const,
      );

      return Object.fromEntries(resolved);
    },

    async resolveCover(token, resolvedAssets) {
      return (
        resolvedAssets[token] ||
        (await resolveAsset({ token, type: 'image' }, 'cover')).url
      );
    },

    async pruneUnusedAssets(activeAssetTokens) {
      const retainedAssets = await mapWithConcurrency(
        Object.entries(assets),
        ASSET_SYNC_CONCURRENCY,
        async ([token, asset]) => {
          if (activeAssetTokens.has(token)) {
            return [token, asset] as const;
          }

          try {
            await publication.deleteAsset(asset.pathname);
            stats = { ...stats, deletedAssets: stats.deletedAssets + 1 };
            return null;
          } catch (error) {
            stats = {
              ...stats,
              failedAssetDeletes: stats.failedAssetDeletes + 1,
            };
            console.warn(
              `Failed to delete unused asset ${asset.pathname}`,
              error,
            );
            return [token, asset] as const;
          }
        },
      );

      assets = Object.fromEntries(
        retainedAssets.filter(
          (entry): entry is readonly [string, BlogSyncAssetState] =>
            entry !== null,
        ),
      );
      return { ...assets };
    },

    getStats() {
      return { ...stats };
    },
  };
};
