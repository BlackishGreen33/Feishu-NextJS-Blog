/** @jest-environment node */
import type { Auth } from 'firebase-admin/auth';
import type { Database } from 'firebase-admin/database';

import {
  getFirebaseAdminAuth,
  getFirebaseAdminDatabase,
} from '@/server/firebase-admin';
import {
  createGuestbookMessage,
  deleteGuestbookMessage,
  listGuestbookMessages,
  moderateGuestbookMessage,
} from '@/server/guestbook';

jest.mock('@/server/firebase-admin', () => ({
  getFirebaseAdminAuth: jest.fn(),
  getFirebaseAdminDatabase: jest.fn(),
}));
jest.mock('@/server/env', () => ({
  getServerEnv: () => ({
    guestbookAdminUids: ['admin'],
    publicEnv: { firebase: { guestbookPath: 'guestbook/messages' } },
  }),
}));

let records: Record<string, Record<string, unknown>>;
let limits: Map<string, unknown>;
let missingIndex: boolean;
const update = jest.fn();
const verifyIdToken = jest.fn(async (uid: string) => {
  if (uid === 'invalid') throw new Error('Invalid token');
  return { uid, email: `${uid}@example.com`, name: uid };
});
const snapshot = (values: Record<string, Record<string, unknown>>) => ({
  exists: () => Object.keys(values).length > 0,
  val: () => values,
  key: 'messages',
  forEach: (visit: (child: { key: string; val: () => unknown }) => void) => {
    for (const [key, value] of Object.entries(values))
      visit({ key, val: () => value });
  },
});

beforeEach(() => {
  records = {};
  limits = new Map();
  missingIndex = false;
  update.mockReset();
  verifyIdToken.mockClear();
  jest
    .mocked(getFirebaseAdminAuth)
    .mockReturnValue({ verifyIdToken } as unknown as Auth);
  const ref = (path: string) => {
    path = path.replace(/\/+$/, '');
    const id = path.slice('guestbook/messages/'.length);
    let indexed = false;
    let boundary: string | undefined;
    let count = Infinity;
    const query = {
      key: id,
      orderByChild: () => {
        indexed = true;
        return query;
      },
      endAt: (date: string) => {
        boundary = date;
        return query;
      },
      limitToLast: (limit: number) => {
        count = limit;
        return query;
      },
      get: async () => {
        if (path !== 'guestbook/messages')
          return {
            key: id,
            exists: () => Boolean(records[id]),
            val: () => records[id],
          };
        if (indexed && missingIndex)
          throw new Error('Index not defined: created_at');
        const entries = Object.entries(records)
          .filter(
            ([, value]) => !boundary || String(value.created_at) <= boundary,
          )
          .sort((left, right) =>
            String(left[1].created_at).localeCompare(
              String(right[1].created_at),
            ),
          )
          .slice(-count);
        return snapshot(Object.fromEntries(entries));
      },
      push: () => ({
        key: 'new-message',
        set: async (value: Record<string, unknown>) => {
          records['new-message'] = value;
        },
      }),
      update: async (value: Record<string, unknown>) => {
        update(value);
        records[id] = { ...records[id], ...value };
      },
      transaction: async (change: (value: unknown) => unknown) => {
        const next = change(limits.get(path) ?? null);
        if (next === undefined) return { committed: false };
        limits.set(path, next);
        return { committed: true };
      },
    };
    return query;
  };
  jest
    .mocked(getFirebaseAdminDatabase)
    .mockReturnValue({ ref } as unknown as Database);
});

it('keeps missing configuration as an empty, anonymous page', async () => {
  jest.mocked(getFirebaseAdminDatabase).mockReturnValue(null);
  await expect(listGuestbookMessages({})).resolves.toMatchObject({
    configured: false,
    messages: [],
    viewer: { isAuthenticated: false },
  });
});

it('requires authentication and trims valid message content', async () => {
  await expect(createGuestbookMessage({ message: 'hello' })).rejects.toThrow(
    'UNAUTHORIZED',
  );
  await expect(
    createGuestbookMessage({
      authorizationHeader: 'Bearer invalid',
      message: 'hello',
    }),
  ).rejects.toThrow('UNAUTHORIZED');
  const result = await createGuestbookMessage({
    authorizationHeader: 'Bearer author',
    message: '  hello  ',
  });
  expect(result.message?.message).toBe('hello');
  expect(records['new-message']?.uid).toBe('author');
  expect(result.viewer.canModerate).toBe(false);
});

it('keeps message error codes and the 500 UTF-16 code-unit limit', async () => {
  await expect(createGuestbookMessage({ message: '   ' })).rejects.toThrow(
    'INVALID_MESSAGE',
  );
  await expect(
    createGuestbookMessage({ message: 'a'.repeat(501) }),
  ).rejects.toThrow('MESSAGE_TOO_LONG');
  await expect(
    createGuestbookMessage({ message: '😀'.repeat(251) }),
  ).rejects.toThrow('MESSAGE_TOO_LONG');
  await expect(
    createGuestbookMessage({ message: 42 as never }),
  ).rejects.toThrow('INVALID_MESSAGE');
});

it('enforces the existing per-user three-message rate limit', async () => {
  for (let i = 0; i < 3; i++)
    await createGuestbookMessage({
      authorizationHeader: 'Bearer author',
      message: 'hi',
    });
  await expect(
    createGuestbookMessage({
      authorizationHeader: 'Bearer author',
      message: 'hi',
    }),
  ).rejects.toThrow('RATE_LIMITED');
});

it.each(['author', 'admin'])(
  'allows the author and administrator to soft-delete: %s',
  async (uid) => {
    records.post = { uid: 'author', message: 'legacy', createdAt: 1000 };
    await expect(
      deleteGuestbookMessage({
        authorizationHeader: `Bearer ${uid}`,
        id: 'post',
      }),
    ).resolves.toMatchObject({
      message: { status: 'deleted', is_show: false },
    });
    expect(update).toHaveBeenCalledTimes(1);
  },
);

it('rejects another author and rejects non-admin moderation', async () => {
  records.post = { uid: 'author', message: 'legacy' };
  await expect(
    deleteGuestbookMessage({ authorizationHeader: 'Bearer other', id: 'post' }),
  ).rejects.toThrow('FORBIDDEN');
  await expect(
    moderateGuestbookMessage({
      authorizationHeader: 'Bearer author',
      id: 'post',
      status: 'hidden',
    }),
  ).rejects.toThrow('FORBIDDEN');
  expect(update).not.toHaveBeenCalled();
});

it.each(['hidden', 'published', 'deleted'])(
  'keeps administrator moderation: %s',
  async (status) => {
    records.post = { uid: 'author', message: 'legacy' };
    await expect(
      moderateGuestbookMessage({
        authorizationHeader: 'Bearer admin',
        id: 'post',
        status,
      }),
    ).resolves.toMatchObject({ message: { status } });
  },
);

it('does not treat an empty message id as the entire collection', async () => {
  records.post = { uid: 'author', message: 'keep' };
  await expect(
    deleteGuestbookMessage({ authorizationHeader: 'Bearer admin', id: '' }),
  ).rejects.toThrow('NOT_FOUND');
  expect(update).not.toHaveBeenCalled();
});

it.each([false, true])(
  'reads legacy fields, visibility and cursor pages (missing index: %s)',
  async (fallback) => {
    missingIndex = fallback;
    records = {
      a: {
        uid: 'author',
        createdAt: 1000,
        created_at: '1970-01-01T00:00:01.000Z',
        message: 'old',
      },
      b: { created_at: '2026-01-02', message: 'hidden', is_show: false },
      c: { created_at: '2026-01-03', message: 'new' },
    };
    const first = await listGuestbookMessages({ limit: 1 });
    expect(first.messages.map((message) => message.id)).toEqual(['c']);
    expect(first.hasMore).toBe(true);
    const second = await listGuestbookMessages({
      limit: 1,
      cursor: first.nextCursor,
    });
    expect(second.messages.map((message) => message.id)).toEqual(['a']);
    expect(second.messages[0]?.createdAt).toBe(1000);
  },
);

it.each([false, true])(
  'advances through equal-timestamp cursor boundaries (missing index: %s)',
  async (fallback) => {
    missingIndex = fallback;
    records = Object.fromEntries(
      ['a', 'b', 'c'].map((id) => [
        id,
        { message: id, created_at: '2026-01-01' },
      ]),
    );
    const visited: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 3; page++) {
      const result = await listGuestbookMessages({ limit: 1, cursor });
      visited.push(...result.messages.map((message) => message.id));
      cursor = result.nextCursor;
    }
    expect(visited).toEqual(['c', 'b', 'a']);
  },
);
