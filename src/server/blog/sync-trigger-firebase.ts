import type { Database } from 'firebase-admin/database';

import { getFirebaseAdminDatabase } from '@/server/firebase-admin';

import {
  completeFeishuSyncLease,
  type FeishuSyncTriggerStore,
  normalizeFeishuSyncTriggerState,
  recordFeishuSyncEvent,
  releaseFeishuSyncLease,
  tryAcquireFeishuSyncLease,
} from './sync-trigger';

const FEISHU_SYNC_TRIGGER_PATH = 'system/feishu-sync-trigger';

export class FeishuSyncTriggerConfigurationError extends Error {
  constructor() {
    super('Firebase Admin is required for Feishu event debounce state');
    this.name = 'FeishuSyncTriggerConfigurationError';
  }
}

export const createFirebaseFeishuSyncTriggerStore = (
  database: Database | null = getFirebaseAdminDatabase(),
): FeishuSyncTriggerStore => {
  if (!database) {
    throw new FeishuSyncTriggerConfigurationError();
  }

  const stateRef = database.ref(FEISHU_SYNC_TRIGGER_PATH);

  return {
    async recordEvent(input) {
      let outcome = recordFeishuSyncEvent(undefined, input);

      await stateRef.transaction((currentValue) => {
        outcome = recordFeishuSyncEvent(currentValue, input);
        return outcome.state;
      });

      return {
        duplicate: outcome.duplicate,
        generation: outcome.generation,
      };
    },

    async readState() {
      const snapshot = await stateRef.get();
      return normalizeFeishuSyncTriggerState(snapshot.val());
    },

    async acquireLease(input) {
      const transaction = await stateRef.transaction((currentValue) => {
        // A cold client can see null before loading existing server state.
        // Keep the transaction alive so Firebase retries with that state.
        if (currentValue === null && input.expectedGeneration > 0) return null;

        const transition = tryAcquireFeishuSyncLease(currentValue, input);
        return transition.acquired ? transition.state : undefined;
      });
      const state = normalizeFeishuSyncTriggerState(transaction.snapshot.val());

      return {
        acquired: transaction.committed && state.lease?.id === input.leaseId,
        generation: state.generation,
      };
    },

    async completeLease(input) {
      await stateRef.transaction((currentValue) =>
        completeFeishuSyncLease(currentValue, input),
      );
    },

    async releaseLease(input) {
      await stateRef.transaction((currentValue) =>
        releaseFeishuSyncLease(currentValue, input),
      );
    },
  };
};
