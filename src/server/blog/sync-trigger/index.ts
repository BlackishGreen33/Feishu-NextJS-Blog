import { randomUUID } from 'crypto';

import type { FeishuSyncTriggerStore, FeishuSyncWakeup } from './state';
export type {
  FeishuSyncLease,
  FeishuSyncTriggerState,
  FeishuSyncTriggerStore,
  FeishuSyncWakeup,
} from './state';
export {
  completeFeishuSyncLease,
  feishuSyncWakeupSchema,
  normalizeFeishuSyncTriggerState,
  recordFeishuSyncEvent,
  releaseFeishuSyncLease,
  tryAcquireFeishuSyncLease,
} from './state';
const DEFAULT_DEBOUNCE_MS = 120_000;
const DEFAULT_MAX_WAIT_MS = 600_000;
export const FEISHU_SYNC_LEASE_DURATION_SECONDS = 120;
const DEFAULT_LEASE_DURATION_MS = FEISHU_SYNC_LEASE_DURATION_SECONDS * 1000;
const DEFAULT_RETENTION_SECONDS = 86_400;

type EnqueueOptions = {
  delaySeconds: number;
  idempotencyKey: string;
  retentionSeconds: number;
};

type CreateFeishuSyncTriggerOptions<SyncResult> = {
  clock?: () => number;
  createLeaseId?: () => string;
  debounceMs?: number;
  enqueue: (
    message: FeishuSyncWakeup,
    options: EnqueueOptions,
  ) => Promise<void>;
  leaseDurationMs?: number;
  maxWaitMs?: number;
  store: FeishuSyncTriggerStore;
  sync: () => Promise<SyncResult>;
};

const defaultCreateLeaseId = () => randomUUID();

export const createFeishuSyncTrigger = <SyncResult>({
  clock = Date.now,
  createLeaseId = defaultCreateLeaseId,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enqueue,
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  store,
  sync,
}: CreateFeishuSyncTriggerOptions<SyncResult>) => {
  const enqueueWakeup = (
    message: FeishuSyncWakeup,
    delaySeconds: number,
    idempotencyKey: string,
  ) =>
    enqueue(message, {
      delaySeconds,
      idempotencyKey,
      retentionSeconds: DEFAULT_RETENTION_SECONDS,
    });

  const runClaimedSync = async (generation: number) => {
    const leaseId = createLeaseId();
    const claim = await store.acquireLease({
      expectedGeneration: generation,
      leaseDurationMs,
      leaseId,
      now: clock(),
    });

    if (!claim.acquired) {
      return { status: 'locked' as const, generation: claim.generation };
    }

    try {
      const result = await sync();
      await store.completeLease({ generation, leaseId });
      return { status: 'synced' as const, generation, result };
    } catch (error) {
      await store.releaseLease({ generation, leaseId });
      throw error;
    }
  };

  return {
    async recordChange({ eventId }: { eventId: string; fileToken: string }) {
      const recorded = await store.recordEvent({
        eventId,
        receivedAt: clock(),
      });
      await enqueueWakeup(
        { eventId, generation: recorded.generation },
        Math.ceil(debounceMs / 1000),
        `feishu:${eventId}`,
      );
      return recorded;
    },

    async processWakeup(message: FeishuSyncWakeup) {
      const state = await store.readState();

      if (state.processedGeneration >= state.generation) {
        return { status: 'idle' as const };
      }

      const now = clock();
      const quietDueAt = (state.lastEventAt ?? now) + debounceMs;
      const maxWaitDueAt = (state.burstStartedAt ?? now) + maxWaitMs;
      const dueAt = Math.min(quietDueAt, maxWaitDueAt);

      if (now < dueAt) {
        const delaySeconds = Math.max(1, Math.ceil((dueAt - now) / 1000));
        const currentMessage = {
          eventId: message.eventId,
          generation: state.generation,
        };
        await enqueueWakeup(
          currentMessage,
          delaySeconds,
          `feishu:g${state.generation}:${dueAt}`,
        );
        return { status: 'requeued' as const, delaySeconds };
      }

      return runClaimedSync(state.generation);
    },

    async runScheduledSync() {
      const state = await store.readState();
      return runClaimedSync(state.generation);
    },
  };
};
