/* eslint-disable no-console */
import { loadEnvConfig } from '@next/env';

import { syncFeishuArticles } from '../src/server/blog/sync';

loadEnvConfig(process.cwd());

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
  if (process.argv.includes('--optional')) {
    console.warn('[feishu-sync] skipped optional sync', error);
    return;
  }

  console.error('[feishu-sync] failed', error);
  process.exit(1);
});
