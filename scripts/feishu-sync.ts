/* eslint-disable no-console */
import { syncFeishuArticles } from '../src/server/blog/sync';

const main = async () => {
  const isOptional = process.argv.includes('--optional');
  const result = await syncFeishuArticles({ optional: isOptional });

  if (result.skipped) {
    console.log(`[feishu-sync] skipped: ${result.reason}`);
    return;
  }

  console.log(
    `[feishu-sync] synced ${result.totalArticles}/${result.totalDocuments} docs to ${result.storage}`,
  );
};

main().catch((error) => {
  console.error('[feishu-sync] failed', error);
  process.exit(1);
});
