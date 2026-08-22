import { QueueClient } from '@vercel/queue';

import {
  createFeishuSyncQueueConsumer,
  createFeishuSyncQueueRetryHandler,
} from '@/server/blog/sync-queue-consumer';
import { FEISHU_SYNC_LEASE_DURATION_SECONDS } from '@/server/blog/sync-trigger';
import { processFeishuSyncWakeup } from '@/server/blog/sync-trigger-production';

const queue = new QueueClient();
const consume = createFeishuSyncQueueConsumer(processFeishuSyncWakeup);

export default queue.handleNodeCallback(consume, {
  visibilityTimeoutSeconds: FEISHU_SYNC_LEASE_DURATION_SECONDS,
  retry: createFeishuSyncQueueRetryHandler(),
});
