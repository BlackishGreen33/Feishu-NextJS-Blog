/** @jest-environment node */

import type { Database } from 'firebase-admin/database';

import {
  createFirebaseFeishuSyncTriggerStore,
  FeishuSyncTriggerConfigurationError,
} from '@/server/blog/sync-trigger-firebase';

const createFakeDatabase = (coldCache = false) => {
  let value: unknown = null;
  const transaction = jest.fn(async (update: (current: unknown) => unknown) => {
    let current = coldCache ? null : value;
    let next = update(current);

    if (next !== undefined && coldCache && value !== null) {
      current = value;
      next = update(current);
    }

    if (next === undefined) {
      return {
        committed: false,
        snapshot: { val: () => current },
      };
    }

    value = next;
    return {
      committed: true,
      snapshot: { val: () => value },
    };
  });
  const get = jest.fn(async () => ({ val: () => value }));
  const ref = jest.fn(() => ({ get, transaction }));

  return {
    database: { ref } as unknown as Database,
    getValue: () => value,
    ref,
  };
};

describe('createFirebaseFeishuSyncTriggerStore', () => {
  it('requires Firebase Admin configuration', () => {
    expect(() => createFirebaseFeishuSyncTriggerStore(null)).toThrow(
      FeishuSyncTriggerConfigurationError,
    );
  });

  it('acquires an existing generation when the transaction cache starts empty', async () => {
    const fake = createFakeDatabase(true);
    const store = createFirebaseFeishuSyncTriggerStore(fake.database);
    await store.recordEvent({ eventId: 'event-1', receivedAt: 1_000 });
    await expect(store.readState()).resolves.toMatchObject({ generation: 1 });

    await expect(
      store.acquireLease({
        expectedGeneration: 1,
        leaseDurationMs: 120_000,
        leaseId: 'lease-cold',
        now: 121_000,
      }),
    ).resolves.toEqual({ acquired: true, generation: 1 });
    expect(fake.getValue()).toMatchObject({
      generation: 1,
      lease: { id: 'lease-cold', generation: 1, expiresAt: 241_000 },
    });
  });

  it.each([
    { expectedGeneration: 0, acquired: true },
    { expectedGeneration: 1, acquired: false },
  ])(
    'handles generation $expectedGeneration when the server state is absent',
    async ({ expectedGeneration, acquired }) => {
      const fake = createFakeDatabase(true);
      const store = createFirebaseFeishuSyncTriggerStore(fake.database);

      await expect(
        store.acquireLease({
          expectedGeneration,
          leaseDurationMs: 120_000,
          leaseId: 'lease-empty',
          now: 121_000,
        }),
      ).resolves.toEqual({ acquired, generation: 0 });
      if (!acquired) expect(fake.getValue()).toBeNull();
    },
  );

  it('persists event deduplication and lease transitions transactionally', async () => {
    const fake = createFakeDatabase();
    const store = createFirebaseFeishuSyncTriggerStore(fake.database);

    await expect(
      store.recordEvent({ eventId: 'event-1', receivedAt: 1_000 }),
    ).resolves.toEqual({ duplicate: false, generation: 1 });
    await expect(
      store.recordEvent({ eventId: 'event-1', receivedAt: 2_000 }),
    ).resolves.toEqual({ duplicate: true, generation: 1 });
    await expect(
      store.acquireLease({
        expectedGeneration: 1,
        leaseDurationMs: 120_000,
        leaseId: 'lease-1',
        now: 121_000,
      }),
    ).resolves.toEqual({ acquired: true, generation: 1 });
    await expect(
      store.acquireLease({
        expectedGeneration: 1,
        leaseDurationMs: 120_000,
        leaseId: 'lease-2',
        now: 121_001,
      }),
    ).resolves.toEqual({ acquired: false, generation: 1 });

    await store.completeLease({ generation: 1, leaseId: 'lease-1' });

    expect(await store.readState()).toMatchObject({
      generation: 1,
      processedGeneration: 1,
      burstStartedAt: null,
      lease: null,
    });
    expect(fake.ref).toHaveBeenCalledWith('system/feishu-sync-trigger');
    expect(fake.getValue()).toEqual(expect.objectContaining({ version: 1 }));
  });
});
