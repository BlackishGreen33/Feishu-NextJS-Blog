import { QueueClient } from '@vercel/queue';

import { syncFeishuArticles } from './sync';
import { createFeishuSyncTrigger } from './sync-trigger';
import {
  createFirebaseFeishuSyncTriggerStore,
  FeishuSyncTriggerConfigurationError,
} from './sync-trigger-firebase';

export const FEISHU_SYNC_QUEUE_TOPIC = 'feishu-sync';

const queue = new QueueClient();

const createProductionTrigger = () =>
  createFeishuSyncTrigger({
    enqueue: async (message, options) => {
      await queue.send(FEISHU_SYNC_QUEUE_TOPIC, message, options);
    },
    store: createFirebaseFeishuSyncTriggerStore(),
    sync: syncFeishuArticles,
  });

export const recordFeishuChange = (input: {
  eventId: string;
  fileToken: string;
}) => createProductionTrigger().recordChange(input);

export const processFeishuSyncWakeup = (input: {
  eventId: string;
  generation: number;
}) => createProductionTrigger().processWakeup(input);

export const runScheduledFeishuSync = async () => {
  try {
    return await createProductionTrigger().runScheduledSync();
  } catch (error) {
    if (!(error instanceof FeishuSyncTriggerConfigurationError)) throw error;

    return {
      status: 'synced' as const,
      generation: 0,
      result: await syncFeishuArticles(),
    };
  }
};
