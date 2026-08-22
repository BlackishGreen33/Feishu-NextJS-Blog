/** @jest-environment node */

import {
  completeFeishuSyncLease,
  createFeishuSyncTrigger,
  type FeishuSyncTriggerState,
  normalizeFeishuSyncTriggerState,
  recordFeishuSyncEvent,
  releaseFeishuSyncLease,
  tryAcquireFeishuSyncLease,
} from '@/server/blog/sync-trigger';

const createState = (
  overrides: Partial<FeishuSyncTriggerState> = {},
): FeishuSyncTriggerState => ({
  version: 1,
  generation: 0,
  processedGeneration: 0,
  burstStartedAt: null,
  lastEventAt: null,
  recentEvents: {},
  lease: null,
  ...overrides,
});

describe('Feishu sync trigger state', () => {
  it('groups unique events into one burst and deduplicates retries', () => {
    const first = recordFeishuSyncEvent(undefined, {
      eventId: 'event-1',
      receivedAt: 1_000,
    });
    const second = recordFeishuSyncEvent(first.state, {
      eventId: 'event-2',
      receivedAt: 30_000,
    });
    const duplicate = recordFeishuSyncEvent(second.state, {
      eventId: 'event-1',
      receivedAt: 45_000,
    });

    expect(first).toMatchObject({ duplicate: false, generation: 1 });
    expect(second).toMatchObject({ duplicate: false, generation: 2 });
    expect(second.state).toMatchObject({
      burstStartedAt: 1_000,
      lastEventAt: 30_000,
    });
    expect(duplicate).toMatchObject({ duplicate: true, generation: 1 });
    expect(duplicate.state).toEqual(second.state);
  });

  it('starts a new burst for events received while a sync is running', () => {
    const recorded = recordFeishuSyncEvent(undefined, {
      eventId: 'event-1',
      receivedAt: 1_000,
    });
    const leased = tryAcquireFeishuSyncLease(recorded.state, {
      expectedGeneration: 1,
      leaseId: 'lease-1',
      now: 121_000,
      leaseDurationMs: 120_000,
    });
    const next = recordFeishuSyncEvent(leased.state, {
      eventId: 'event-2',
      receivedAt: 130_000,
    });
    const completed = completeFeishuSyncLease(next.state, {
      generation: 1,
      leaseId: 'lease-1',
    });

    expect(leased.acquired).toBe(true);
    expect(next.state).toMatchObject({
      generation: 2,
      processedGeneration: 0,
      burstStartedAt: 130_000,
      lastEventAt: 130_000,
    });
    expect(completed).toMatchObject({
      generation: 2,
      processedGeneration: 1,
      burstStartedAt: 130_000,
      lease: null,
    });
  });

  it('allows only one live lease and releases matching failures', () => {
    const state = createState({
      generation: 2,
      burstStartedAt: 1_000,
      lastEventAt: 30_000,
    });
    const first = tryAcquireFeishuSyncLease(state, {
      expectedGeneration: 2,
      leaseId: 'lease-1',
      now: 150_000,
      leaseDurationMs: 120_000,
    });
    const concurrent = tryAcquireFeishuSyncLease(first.state, {
      expectedGeneration: 2,
      leaseId: 'lease-2',
      now: 150_001,
      leaseDurationMs: 120_000,
    });

    expect(first.acquired).toBe(true);
    expect(concurrent.acquired).toBe(false);
    expect(
      releaseFeishuSyncLease(first.state, {
        generation: 2,
        leaseId: 'lease-1',
      }),
    ).toMatchObject({ lease: null, processedGeneration: 0 });
  });

  it('fails closed when persisted state has an unknown shape', () => {
    expect(
      normalizeFeishuSyncTriggerState({
        generation: 'bad',
        lease: { id: 123 },
        recentEvents: { unsafe: { generation: 'bad' } },
      }),
    ).toEqual(createState());
  });
});

describe('createFeishuSyncTrigger', () => {
  const now = 500_000;
  const enqueue = jest.fn();
  const sync = jest.fn();
  const store = {
    acquireLease: jest.fn(),
    completeLease: jest.fn(),
    readState: jest.fn(),
    recordEvent: jest.fn(),
    releaseLease: jest.fn(),
  };
  const trigger = createFeishuSyncTrigger({
    clock: () => now,
    createLeaseId: () => 'lease-1',
    enqueue,
    store,
    sync,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('durably records an event before scheduling a delayed wakeup', async () => {
    store.recordEvent.mockResolvedValue({ duplicate: false, generation: 3 });
    enqueue.mockResolvedValue(undefined);

    await expect(
      trigger.recordChange({ eventId: 'event-3', fileToken: 'doc-3' }),
    ).resolves.toEqual({ duplicate: false, generation: 3 });

    expect(store.recordEvent).toHaveBeenCalledWith({
      eventId: 'event-3',
      receivedAt: now,
    });
    expect(enqueue).toHaveBeenCalledWith(
      { eventId: 'event-3', generation: 3 },
      {
        delaySeconds: 120,
        idempotencyKey: 'feishu:event-3',
        retentionSeconds: 86_400,
      },
    );
  });

  it('requeues the current generation when a newer event lost its enqueue', async () => {
    store.readState.mockResolvedValue(
      createState({
        generation: 3,
        burstStartedAt: 400_000,
        lastEventAt: 450_000,
      }),
    );

    await expect(
      trigger.processWakeup({ eventId: 'event-2', generation: 2 }),
    ).resolves.toEqual({ status: 'requeued', delaySeconds: 70 });

    expect(enqueue).toHaveBeenCalledWith(
      { eventId: 'event-2', generation: 3 },
      {
        delaySeconds: 70,
        idempotencyKey: 'feishu:g3:570000',
        retentionSeconds: 86_400,
      },
    );
    expect(sync).not.toHaveBeenCalled();
  });

  it('requeues the latest wakeup until the trailing debounce is due', async () => {
    store.readState.mockResolvedValue(
      createState({
        generation: 3,
        burstStartedAt: 400_000,
        lastEventAt: 450_000,
      }),
    );
    enqueue.mockResolvedValue(undefined);

    await expect(
      trigger.processWakeup({ eventId: 'event-3', generation: 3 }),
    ).resolves.toEqual({ status: 'requeued', delaySeconds: 70 });

    expect(enqueue).toHaveBeenCalledWith(
      { eventId: 'event-3', generation: 3 },
      {
        delaySeconds: 70,
        idempotencyKey: 'feishu:g3:570000',
        retentionSeconds: 86_400,
      },
    );
  });

  it('syncs once after the quiet window and completes the claimed generation', async () => {
    const state = createState({
      generation: 3,
      burstStartedAt: 300_000,
      lastEventAt: 370_000,
    });
    store.readState.mockResolvedValue(state);
    store.acquireLease.mockResolvedValue({ acquired: true, generation: 3 });
    store.completeLease.mockResolvedValue(undefined);
    sync.mockResolvedValue({ changedArticles: 2 });

    await expect(
      trigger.processWakeup({ eventId: 'event-3', generation: 3 }),
    ).resolves.toEqual({
      status: 'synced',
      generation: 3,
      result: { changedArticles: 2 },
    });

    expect(store.acquireLease).toHaveBeenCalledWith({
      expectedGeneration: 3,
      leaseDurationMs: 120_000,
      leaseId: 'lease-1',
      now,
    });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(store.completeLease).toHaveBeenCalledWith({
      generation: 3,
      leaseId: 'lease-1',
    });
  });

  it('honors maxWait during continuous edits', async () => {
    store.readState.mockResolvedValue(
      createState({
        generation: 20,
        burstStartedAt: now - 600_000,
        lastEventAt: now - 5_000,
      }),
    );
    store.acquireLease.mockResolvedValue({ acquired: true, generation: 20 });
    sync.mockResolvedValue({ changedArticles: 1 });

    await expect(
      trigger.processWakeup({ eventId: 'event-19', generation: 19 }),
    ).resolves.toMatchObject({ status: 'synced', generation: 20 });
  });

  it('keeps a maxWait wakeup scheduled throughout continuous edits', async () => {
    store.readState.mockResolvedValue(
      createState({
        generation: 20,
        burstStartedAt: 0,
        lastEventAt: 495_000,
      }),
    );
    enqueue.mockResolvedValue(undefined);

    await expect(
      trigger.processWakeup({ eventId: 'event-1', generation: 1 }),
    ).resolves.toEqual({ status: 'requeued', delaySeconds: 100 });

    expect(enqueue).toHaveBeenCalledWith(
      { eventId: 'event-1', generation: 20 },
      {
        delaySeconds: 100,
        idempotencyKey: 'feishu:g20:600000',
        retentionSeconds: 86_400,
      },
    );
  });

  it('keeps pending state when synchronization fails', async () => {
    store.readState.mockResolvedValue(
      createState({
        generation: 3,
        burstStartedAt: 300_000,
        lastEventAt: 370_000,
      }),
    );
    store.acquireLease.mockResolvedValue({ acquired: true, generation: 3 });
    store.releaseLease.mockResolvedValue(undefined);
    sync.mockRejectedValue(new Error('blob unavailable'));

    await expect(
      trigger.processWakeup({ eventId: 'event-3', generation: 3 }),
    ).rejects.toThrow('blob unavailable');

    expect(store.completeLease).not.toHaveBeenCalled();
    expect(store.releaseLease).toHaveBeenCalledWith({
      generation: 3,
      leaseId: 'lease-1',
    });
  });

  it('runs the scheduled reconciliation under the same global lease', async () => {
    store.readState.mockResolvedValue(createState({ generation: 4 }));
    store.acquireLease.mockResolvedValue({ acquired: true, generation: 4 });
    sync.mockResolvedValue({ changedArticles: 0 });

    await expect(trigger.runScheduledSync()).resolves.toMatchObject({
      status: 'synced',
      generation: 4,
    });

    expect(store.acquireLease).toHaveBeenCalledWith({
      expectedGeneration: 4,
      leaseDurationMs: 120_000,
      leaseId: 'lease-1',
      now,
    });
  });
});
