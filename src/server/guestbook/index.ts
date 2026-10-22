import type { DataSnapshot } from 'firebase-admin/database';

import {
  guestbookMessageIdSchema,
  guestbookMessageInputSchema,
  guestbookStatusSchema,
  legacyGuestbookRecordSchema,
} from '@/common/schemas/guestbook';
import {
  GuestbookMessagesPage,
  GuestbookModerationStatus,
  MessageProps,
} from '@/common/types/chat';

import { getGuestbookViewerFromAuthHeader } from './auth';
export { getGuestbookViewerFromAuthHeader } from './auth';
import {
  buildGuestbookRecord,
  decodeCursor,
  encodeCursor,
  getSnapshotMessages,
  isMissingGuestbookIndexError,
  normalizeGuestbookMessage,
  paginateVisibleMessages,
  sortGuestbookMessages,
} from './records';
import { getServerEnv } from '../env';
import { getFirebaseAdminDatabase } from '../firebase-admin';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 3;
const RATE_LIMIT_PATH_SUFFIX = 'meta/rate-limits';

const getGuestbookPaths = () => {
  const {
    publicEnv: {
      firebase: { guestbookPath },
    },
  } = getServerEnv();

  const normalizedGuestbookPath = guestbookPath.replace(/^\/+|\/+$/g, '');
  if (!normalizedGuestbookPath) throw new Error('GUESTBOOK_NOT_CONFIGURED');
  const pathSegments = normalizedGuestbookPath.split('/').filter(Boolean);
  const guestbookRootPath =
    pathSegments.length > 1
      ? pathSegments.slice(0, -1).join('/')
      : normalizedGuestbookPath;

  return {
    guestbookPath: normalizedGuestbookPath,
    rateLimitPath: `${guestbookRootPath}/${RATE_LIMIT_PATH_SUFFIX}`,
  };
};

export const hasGuestbookServerConfig = () => {
  const {
    publicEnv: {
      firebase: { guestbookPath },
    },
  } = getServerEnv();

  return Boolean(guestbookPath) && Boolean(getFirebaseAdminDatabase());
};

const clampPageSize = (limit?: number) => {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
};

const assertGuestbookConfigured = () => {
  if (!hasGuestbookServerConfig()) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }
};

const assertModerationStatus = (
  status: unknown,
): status is GuestbookModerationStatus =>
  guestbookStatusSchema.safeParse(status).success;

export const listGuestbookMessages = async ({
  authorizationHeader,
  cursor,
  limit,
}: {
  authorizationHeader?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<GuestbookMessagesPage> => {
  if (!hasGuestbookServerConfig()) {
    return {
      configured: false,
      hasMore: false,
      messages: [],
      nextCursor: null,
      viewer: {
        canModerate: false,
        isAuthenticated: false,
        uid: null,
      },
    };
  }

  const viewerAuth =
    await getGuestbookViewerFromAuthHeader(authorizationHeader);
  const database = getFirebaseAdminDatabase();

  if (!database) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }

  const { guestbookPath } = getGuestbookPaths();
  const requestedLimit = clampPageSize(limit);
  const batchSize = Math.min(Math.max(requestedLimit * 3, 30), 120);
  const readPageWithFallback = async () => {
    const fallbackSnapshot = await database.ref(guestbookPath).get();
    const fallbackMessages = fallbackSnapshot.exists()
      ? getSnapshotMessages(fallbackSnapshot)
      : [];

    return paginateVisibleMessages({
      cursor: cursor ?? null,
      messages: fallbackMessages,
      requestedLimit,
    });
  };

  const collected: MessageProps[] = [];
  const seenIds = new Set<string>();

  let boundary = decodeCursor(cursor);
  let exhausted = false;
  let hasMore = false;
  let iterations = 0;

  while (collected.length < requestedLimit && !exhausted && iterations < 5) {
    iterations += 1;

    let query = database.ref(guestbookPath).orderByChild('created_at');

    if (boundary?.created_at) {
      query = query.endAt(boundary.created_at);
    }

    let snapshot: DataSnapshot;

    try {
      snapshot = await query.limitToLast(batchSize + (boundary ? 1 : 0)).get();
    } catch (error) {
      if (isMissingGuestbookIndexError(error)) {
        const fallbackPage = await readPageWithFallback();

        return {
          configured: true,
          ...fallbackPage,
          viewer: viewerAuth.viewer,
        };
      }

      throw error;
    }

    if (!snapshot.exists()) {
      exhausted = true;
      break;
    }

    let batch = getSnapshotMessages(snapshot);

    if (boundary) {
      const currentBoundary = boundary;
      batch = batch.filter(
        (message) => sortGuestbookMessages(message, currentBoundary) < 0,
      );
    }

    if (batch.length === 0) {
      exhausted = true;
      break;
    }

    const visibleBatch = batch.filter(
      (message) => message.status === 'published' && !seenIds.has(message.id),
    );
    const remaining = requestedLimit - collected.length;
    const slice = visibleBatch.slice(-remaining);

    slice.forEach((message) => seenIds.add(message.id));
    collected.unshift(...slice);

    const oldestBatchMessage = batch[0];
    boundary = oldestBatchMessage
      ? { created_at: oldestBatchMessage.created_at, id: oldestBatchMessage.id }
      : null;

    if (batch.length < batchSize) {
      exhausted = true;
    }

    if (visibleBatch.length > remaining || !exhausted) {
      hasMore = true;
    }
  }

  const messages = collected.slice(-requestedLimit).sort(sortGuestbookMessages);
  const oldestMessage = messages[0];
  const nextCursor =
    hasMore && oldestMessage
      ? encodeCursor({
          created_at: oldestMessage.created_at,
          id: oldestMessage.id,
        })
      : null;

  return {
    configured: true,
    hasMore: Boolean(nextCursor),
    messages,
    nextCursor,
    viewer: viewerAuth.viewer,
  };
};

const assertRateLimit = async (uid: string) => {
  const database = getFirebaseAdminDatabase();

  if (!database) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }

  const { rateLimitPath } = getGuestbookPaths();
  const now = Date.now();
  const rateLimitRef = database.ref(`${rateLimitPath}/${uid}`);

  const transaction = await rateLimitRef.transaction((currentValue) => {
    const parsed = legacyGuestbookRecordSchema.safeParse(currentValue);
    const current = parsed.success ? parsed.data : null;

    const windowStartedAt =
      typeof current?.windowStartedAt === 'number'
        ? current.windowStartedAt
        : now;
    const count = typeof current?.count === 'number' ? current.count : 0;

    if (now - windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
      return {
        count: 1,
        updatedAt: now,
        windowStartedAt: now,
      };
    }

    if (count >= RATE_LIMIT_MAX_MESSAGES) {
      return;
    }

    return {
      count: count + 1,
      updatedAt: now,
      windowStartedAt,
    };
  });

  if (!transaction.committed) {
    throw new Error('RATE_LIMITED');
  }
};

export const createGuestbookMessage = async ({
  authorizationHeader,
  message,
}: {
  authorizationHeader?: string | null;
  message: unknown;
}) => {
  assertGuestbookConfigured();

  const parsed = guestbookMessageInputSchema.safeParse(message);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || 'INVALID_MESSAGE');
  const trimmedMessage = parsed.data;

  const viewerAuth = await getGuestbookViewerFromAuthHeader(
    authorizationHeader,
    {
      requireAuth: true,
    },
  );

  if (viewerAuth.kind !== 'authenticated') {
    throw new Error('UNAUTHORIZED');
  }

  await assertRateLimit(viewerAuth.token.uid);

  const database = getFirebaseAdminDatabase();

  if (!database) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }

  const { guestbookPath } = getGuestbookPaths();
  const messageRef = database.ref(guestbookPath).push();
  const record = buildGuestbookRecord(viewerAuth.token, trimmedMessage);

  record.id = messageRef.key || '';

  await messageRef.set(record);

  return {
    message: normalizeGuestbookMessage(record.id, record),
    viewer: viewerAuth.viewer,
  };
};

const getGuestbookMessageRef = (id: string) => {
  const database = getFirebaseAdminDatabase();

  if (!database) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }

  if (!guestbookMessageIdSchema.safeParse(id).success)
    throw new Error('NOT_FOUND');
  const { guestbookPath } = getGuestbookPaths();
  return database.ref(`${guestbookPath}/${id}`);
};

const getExistingGuestbookMessage = async (id: string) => {
  const messageRef = getGuestbookMessageRef(id);
  const snapshot = await messageRef.get();

  if (!snapshot.exists()) {
    throw new Error('NOT_FOUND');
  }

  const message = normalizeGuestbookMessage(snapshot.key || id, snapshot.val());

  if (!message) {
    throw new Error('NOT_FOUND');
  }

  return { message, messageRef };
};

export const deleteGuestbookMessage = async ({
  authorizationHeader,
  id,
}: {
  authorizationHeader?: string | null;
  id: string;
}) => {
  assertGuestbookConfigured();

  const viewerAuth = await getGuestbookViewerFromAuthHeader(
    authorizationHeader,
    {
      requireAuth: true,
    },
  );

  if (viewerAuth.kind !== 'authenticated') {
    throw new Error('UNAUTHORIZED');
  }

  const { message, messageRef } = await getExistingGuestbookMessage(id);
  const canDelete =
    viewerAuth.viewer.canModerate || message.uid === viewerAuth.viewer.uid;

  if (!canDelete) {
    throw new Error('FORBIDDEN');
  }

  const now = Date.now();
  const deleted_at = new Date(now).toISOString();

  await messageRef.update({
    deletedAt: now,
    deleted_at,
    is_show: false,
    status: 'deleted',
    updatedAt: now,
    updated_at: deleted_at,
  });

  return {
    message: {
      ...message,
      deletedAt: now,
      deleted_at,
      is_show: false,
      status: 'deleted',
      updatedAt: now,
      updated_at: deleted_at,
    } satisfies MessageProps,
    viewer: viewerAuth.viewer,
  };
};

export const moderateGuestbookMessage = async ({
  authorizationHeader,
  id,
  status,
}: {
  authorizationHeader?: string | null;
  id: string;
  status: unknown;
}) => {
  assertGuestbookConfigured();

  if (!assertModerationStatus(status)) {
    throw new Error('INVALID_STATUS');
  }

  const viewerAuth = await getGuestbookViewerFromAuthHeader(
    authorizationHeader,
    {
      requireAuth: true,
    },
  );

  if (viewerAuth.kind !== 'authenticated') {
    throw new Error('UNAUTHORIZED');
  }

  if (!viewerAuth.viewer.canModerate) {
    throw new Error('FORBIDDEN');
  }

  const { message, messageRef } = await getExistingGuestbookMessage(id);
  const now = Date.now();
  const updated_at = new Date(now).toISOString();

  await messageRef.update({
    deletedAt: status === 'deleted' ? now : null,
    deleted_at: status === 'deleted' ? updated_at : null,
    is_show: status === 'published',
    status,
    updatedAt: now,
    updated_at,
  });

  return {
    message: {
      ...message,
      deletedAt: status === 'deleted' ? now : null,
      deleted_at: status === 'deleted' ? updated_at : null,
      is_show: status === 'published',
      status,
      updatedAt: now,
      updated_at,
    } satisfies MessageProps,
    viewer: viewerAuth.viewer,
  };
};
