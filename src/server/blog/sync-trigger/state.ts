import { z } from 'zod';
const RECENT_EVENT_TTL_MS = 86_400_000;
const MAX_RECENT_EVENTS = 256;
const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const recentEventSchema = z.object({
  generation: safeInteger,
  receivedAt: safeInteger,
});
const leaseSchema = z.object({
  id: z.string(),
  generation: safeInteger,
  expiresAt: safeInteger,
});
export const feishuSyncWakeupSchema = z.object({
  eventId: z.string().min(1),
  generation: safeInteger.positive(),
});
const triggerStateSchema = z.object({
  version: z.literal(1),
  generation: safeInteger,
  processedGeneration: safeInteger,
  burstStartedAt: safeInteger.nullable(),
  lastEventAt: safeInteger.nullable(),
  recentEvents: z.record(z.string(), recentEventSchema),
  lease: leaseSchema.nullable(),
});
type RecentFeishuEvent = z.infer<typeof recentEventSchema>;
export type FeishuSyncLease = z.infer<typeof leaseSchema>;
export type FeishuSyncTriggerState = z.infer<typeof triggerStateSchema>;
export type FeishuSyncWakeup = z.infer<typeof feishuSyncWakeupSchema>;

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

  return triggerStateSchema.parse({
    version: 1,
    generation: value.generation,
    processedGeneration,
    burstStartedAt: normalizeOptionalTimestamp(value.burstStartedAt),
    lastEventAt: normalizeOptionalTimestamp(value.lastEventAt),
    recentEvents,
    lease,
  });
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
