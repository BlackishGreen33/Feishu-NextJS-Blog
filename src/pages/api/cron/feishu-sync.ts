import type { NextApiRequest, NextApiResponse } from 'next';

import { authorizeCronRequest } from '@/server/blog/cron';
import { ensureFeishuDocumentEventSubscriptions } from '@/server/blog/feishu-subscriptions';
import { FEISHU_SYNC_LEASE_DURATION_SECONDS } from '@/server/blog/sync-trigger';
import { runScheduledFeishuSync } from '@/server/blog/sync-trigger-production';

const reconcileSubscriptions = async () => {
  try {
    return await ensureFeishuDocumentEventSubscriptions();
  } catch (error) {
    // Keep detailed provider errors in private function logs.
    // eslint-disable-next-line no-console
    console.error(
      'Unable to reconcile Feishu document subscriptions',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return {
      failed: true as const,
      message: 'Subscription reconciliation failed',
    };
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!authorizeCronRequest(req)) {
    return res.status(401).json({ status: false, message: 'Unauthorized' });
  }

  try {
    const subscriptions = await reconcileSubscriptions();
    const result = await runScheduledFeishuSync();

    if (result.status === 'locked') {
      res.setHeader('Retry-After', String(FEISHU_SYNC_LEASE_DURATION_SECONDS));
      return res.status(503).json({
        status: false,
        error: 'Another Feishu sync is already running',
        trigger: { status: result.status, generation: result.generation },
        subscriptions,
      });
    }

    return res.status(200).json({
      status: true,
      data: result.result,
      trigger: { status: result.status, generation: result.generation },
      subscriptions,
    });
  } catch (error) {
    // Keep detailed provider errors in private function logs.
    // eslint-disable-next-line no-console
    console.error(
      'Unable to synchronize Feishu articles',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return res.status(500).json({
      status: false,
      error: 'Feishu sync failed',
    });
  }
}
