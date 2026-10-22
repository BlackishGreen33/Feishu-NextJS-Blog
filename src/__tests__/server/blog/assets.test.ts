import { createArticleAssetManager } from '@/server/blog/assets';
import { ArticleSourceAdapter } from '@/server/blog/source';

it('shares an asset download across Articles and retains it until all references disappear', async () => {
  const source: jest.Mocked<ArticleSourceAdapter> = {
    listDocuments: jest.fn(),
    inspectDocument: jest.fn(),
    readDocument: jest.fn(),
    downloadAsset: jest.fn().mockResolvedValue({
      body: Buffer.from('image'),
      contentType: 'image/png',
      contentDisposition: null,
    }),
  };
  const publication = {
    assetExists: jest.fn().mockResolvedValue(true),
    writeAsset: jest.fn().mockResolvedValue('/asset.png'),
    deleteAsset: jest.fn(),
  };
  const manager = createArticleAssetManager({
    publication,
    source,
    initialAssets: {},
  });
  const asset = { token: 'shared', type: 'image' as const };
  await Promise.all([
    manager.resolveArticleAssets({ first: asset }),
    manager.resolveArticleAssets({ second: asset }),
  ]);
  expect(source.downloadAsset).toHaveBeenCalledTimes(1);
  await manager.pruneUnusedAssets(new Set(['shared']));
  expect(publication.deleteAsset).not.toHaveBeenCalled();
  await manager.pruneUnusedAssets(new Set());
  expect(publication.deleteAsset).toHaveBeenCalledTimes(1);
});
