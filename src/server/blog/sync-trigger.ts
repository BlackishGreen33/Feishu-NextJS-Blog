import { randomUUID } from 'crypto';

const DEFAULT_DEBOUNCE_MS = 120_000;
const DEFAULT_MAX_WAIT_MS = 600_000;
export const FEISHU_SYNC_LEASE_DURATION_SECONDS = 120;
const DEFAULT_LEASE_DURATION_MS = FEISHU_SYNC_LEASE_DURATION_SECONDS * 1000;
const DEFAULT_RETENTION_SECONDS = 86_400;
const RECENT_EVENT_TTL_MS = 86_400_000;
const MAX_RECENT_EVENTS = 256;

type RecentFeishuEvent = {
  generation: number;
  receivedAt: number;
};

export type FeishuSyncLease = {
  id: string;
  generation: number;
  expiresAt: number;
};

export type FeishuSyncTriggerState = {
  version: 1;
  generation: number;
  processedGeneration: number;
  burstStartedAt: number | null;
  lastEventAt: number | null;
  recentEvents: Record<string, RecentFeishuEvent>;
  lease: FeishuSyncLease | null;
};

export type FeishuSyncWakeup = {
  eventId: string;
  generation: number;
};

type RecordEventInput = {
  eventId: string;
  receivedAt: number;
};

type LeaseInput = {
  expectedGeneration: number;
  leaseDurationMs: number;
  leaseId: string;
  now: number;
};

type CompleteLeaseInput = {
  generation: number;
  leaseId: string;
};

export interface FeishuSyncTriggerStore {
  acquireLease: (
    input: LeaseInput,
  ) => Promise<{ acquired: boolean; generation: number }>;
  completeLease: (input: CompleteLeaseInput) => Promise<void>;
  readState: () => Promise<FeishuSyncTriggerState>;
  recordEvent: (
    input: RecordEventInput,
  ) => Promise<{ duplicate: boolean; generation: number }>;
  releaseLease: (input: CompleteLeaseInput) => Promise<void>;
}

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

const createEmptyState = (): FeishuSyncTriggerState => ({
  version: 1,
  generation: 0,
  processedGeneration: 0,
  burstStartedAt: null,
  lastEventAt: null,
  recentEvents: {},
  lease: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const normalizeOptionalTimestamp = (value: unknown) =>
  isNonNegativeInteger(value) ? value : null;

export const normalizeFeishuSyncTriggerState = (
  value: unknown,
): FeishuSyncTriggerState => {
  if (!isRecord(value) || !isNonNegativeInteger(value.generation)) {
    return createEmptyState();
  }

  const processedGeneration = isNonNegativeInteger(value.processedGeneration)
    ? Math.min(value.processedGeneration, value.generation)
    : 0;
  const recentEvents = isRecord(value.recentEvents)
    ? Object.fromEntries(
        Object.entries(value.recentEvents).flatMap(([eventId, event]) => {
          if (
            !eventId ||
            !isRecord(event) ||
            !isNonNegativeInteger(event.generation) ||
            !isNonNegativeInteger(event.receivedAt)
          ) {
            return [];
          }

          return [
            [
              eventId,
              {
                generation: event.generation,
                receivedAt: event.receivedAt,
              },
            ],
          ];
        }),
      )
    : {};
  const lease = isRecord(value.lease)
    ? typeof value.lease.id === 'string' &&
      value.lease.id &&
      isNonNegativeInteger(value.lease.generation) &&
      isNonNegativeInteger(value.lease.expiresAt)
      ? {
          id: value.lease.id,
          generation: value.lease.generation,
          expiresAt: value.lease.expiresAt,
        }
      : null
    : null;

  return {
    version: 1,
    generation: value.generation,
    processedGeneration,
    burstStartedAt: normalizeOptionalTimestamp(value.burstStartedAt),
    lastEventAt: normalizeOptionalTimestamp(value.lastEventAt),
    recentEvents,
    lease,
  };
};

const pruneRecentEvents = (
  recentEvents: Record<string, RecentFeishuEvent>,
  now: number,
) =>
  Object.fromEntries(
    Object.entries(recentEvents)
      .filter(([, event]) => now - event.receivedAt <= RECENT_EVENT_TTL_MS)
      .sort(([, left], [, right]) => right.receivedAt - left.receivedAt)
      .slice(0, MAX_RECENT_EVENTS),
  );

export const recordFeishuSyncEvent = (
  value: unknown,
  input: RecordEventInput,
) => {
  const state = normalizeFeishuSyncTriggerState(value);
  const recentEvents = pruneRecentEvents(state.recentEvents, input.receivedAt);
  const existingEvent = recentEvents[input.eventId];

  if (existingEvent) {
    return {
      state: { ...state, recentEvents },
      duplicate: true,
      generation: existingEvent.generation,
    };
  }

  const generation = state.generation + 1;
  const startsNewBurst =
    state.processedGeneration >= state.generation ||
    state.lease?.generation === state.generation;
  const nextState: FeishuSyncTriggerState = {
    ...state,
    generation,
    burstStartedAt:
      startsNewBurst || state.burstStartedAt === null
        ? input.receivedAt
        : state.burstStartedAt,
    lastEventAt: input.receivedAt,
    recentEvents: {
      ...recentEvents,
      [input.eventId]: { generation, receivedAt: input.receivedAt },
    },
  };

  return { state: nextState, duplicate: false, generation };
};

export const tryAcquireFeishuSyncLease = (
  value: unknown,
  input: LeaseInput,
) => {
  const state = normalizeFeishuSyncTriggerState(value);
  const hasLiveLease = Boolean(
    state.lease && state.lease.expiresAt > input.now,
  );

  if (state.generation !== input.expectedGeneration || hasLiveLease) {
    return { state, acquired: false, generation: state.generation };
  }

  return {
    state: {
      ...state,
      lease: {
        id: input.leaseId,
        generation: input.expectedGeneration,
        expiresAt: input.now + input.leaseDurationMs,
      },
    } satisfies FeishuSyncTriggerState,
    acquired: true,
    generation: input.expectedGeneration,
  };
};

const leaseMatches = (
  state: FeishuSyncTriggerState,
  input: CompleteLeaseInput,
) =>
  state.lease?.id === input.leaseId &&
  state.lease.generation === input.generation;

export const completeFeishuSyncLease = (
  value: unknown,
  input: CompleteLeaseInput,
): FeishuSyncTriggerState => {
  const state = normalizeFeishuSyncTriggerState(value);

  if (!leaseMatches(state, input)) return state;

  const hasNewerEvents = state.generation > input.generation;

  return {
    ...state,
    processedGeneration: Math.max(state.processedGeneration, input.generation),
    burstStartedAt: hasNewerEvents ? state.burstStartedAt : null,
    lastEventAt: hasNewerEvents ? state.lastEventAt : null,
    lease: null,
  };
};

export const releaseFeishuSyncLease = (
  value: unknown,
  input: CompleteLeaseInput,
): FeishuSyncTriggerState => {
  const state = normalizeFeishuSyncTriggerState(value);
  return leaseMatches(state, input) ? { ...state, lease: null } : state;
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
    async recordChange({
      eventId,
      fileToken: _fileToken,
    }: {
      eventId: string;
      fileToken: string;
    }) {
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
