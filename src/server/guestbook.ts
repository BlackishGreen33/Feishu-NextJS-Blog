import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DataSnapshot } from 'firebase-admin/database';

import { SITE_PROFILE_IMAGE } from '@/common/config/site';
import {
  GuestbookMessageRecord,
  GuestbookMessagesPage,
  GuestbookMessageStatus,
  GuestbookModerationStatus,
  GuestbookViewer,
  MessageProps,
} from '@/common/types/chat';

import { getServerEnv } from './env';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDatabase,
} from './firebase-admin';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 3;
const RATE_LIMIT_PATH_SUFFIX = 'meta/rate-limits';

type GuestbookCursor = {
  created_at: string;
  id: string;
};

type ViewerAuthResult =
  | {
      kind: 'authenticated';
      token: DecodedIdToken;
      viewer: GuestbookViewer;
    }
  | {
      kind: 'anonymous';
      viewer: GuestbookViewer;
    };

const getGuestbookPaths = () => {
  const {
    publicEnv: {
      firebase: { guestbookPath },
    },
  } = getServerEnv();

  const normalizedGuestbookPath = guestbookPath.replace(/^\/+|\/+$/g, '');
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

const getMessageDate = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date(0).toISOString();
};

const getMessageTimestamp = (value: unknown, fallback: string) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = new Date(fallback).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isMessageStatus = (value: unknown): value is GuestbookMessageStatus =>
  value === 'published' || value === 'hidden' || value === 'deleted';

const normalizeGuestbookMessage = (
  snapshotKey: string,
  value: unknown,
): MessageProps | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === 'string' && record.id ? record.id : snapshotKey;
  const created_at = getMessageDate(record.created_at ?? record.createdAt);
  const updated_at = getMessageDate(
    record.updated_at ?? record.updatedAt ?? created_at,
  );
  const deleted_at =
    record.deleted_at || record.deletedAt
      ? getMessageDate(record.deleted_at ?? record.deletedAt)
      : null;
  const status = isMessageStatus(record.status)
    ? record.status
    : record.is_show === false
      ? 'hidden'
      : deleted_at
        ? 'deleted'
        : 'published';

  return {
    createdAt: getMessageTimestamp(record.createdAt, created_at),
    created_at,
    deletedAt:
      deleted_at === null
        ? null
        : getMessageTimestamp(record.deletedAt, deleted_at),
    deleted_at,
    email: typeof record.email === 'string' ? record.email : '',
    id,
    image: typeof record.image === 'string' ? record.image : SITE_PROFILE_IMAGE,
    is_show: status === 'published',
    message: typeof record.message === 'string' ? record.message : '',
    name: typeof record.name === 'string' ? record.name : 'Guest',
    status,
    uid: typeof record.uid === 'string' ? record.uid : '',
    updatedAt: getMessageTimestamp(record.updatedAt, updated_at),
    updated_at,
  };
};

const sortGuestbookMessages = (left: MessageProps, right: MessageProps) => {
  if (left.created_at === right.created_at) {
    return left.id.localeCompare(right.id);
  }

  return left.created_at.localeCompare(right.created_at);
};

const encodeCursor = (cursor: GuestbookCursor) =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

const decodeCursor = (value?: string | null): GuestbookCursor | null => {
  if (!value) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as GuestbookCursor;

    if (decoded?.created_at && decoded?.id) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
};

const getSnapshotMessages = (snapshot: DataSnapshot) => {
  const messages: MessageProps[] = [];

  snapshot.forEach((child) => {
    const normalized = normalizeGuestbookMessage(child.key || '', child.val());

    if (normalized) {
      messages.push(normalized);
    }
  });

  return messages.sort(sortGuestbookMessages);
};

const getAuthorizationToken = (authorizationHeader?: string | null) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

export const getGuestbookViewerFromAuthHeader = async (
  authorizationHeader?: string | null,
  options: { requireAuth?: boolean } = {},
): Promise<ViewerAuthResult> => {
  const idToken = getAuthorizationToken(authorizationHeader);
  const { guestbookAdminUids } = getServerEnv();

  if (!idToken) {
    if (options.requireAuth) {
      throw new Error('UNAUTHORIZED');
    }

    return {
      kind: 'anonymous',
      viewer: {
        canModerate: false,
        isAuthenticated: false,
        uid: null,
      },
    };
  }

  const auth = getFirebaseAdminAuth();

  if (!auth) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }

  try {
    const token = await auth.verifyIdToken(idToken);

    return {
      kind: 'authenticated',
      token,
      viewer: {
        canModerate: guestbookAdminUids.includes(token.uid),
        isAuthenticated: true,
        uid: token.uid,
      },
    };
  } catch {
    if (options.requireAuth) {
      throw new Error('UNAUTHORIZED');
    }

    return {
      kind: 'anonymous',
      viewer: {
        canModerate: false,
        isAuthenticated: false,
        uid: null,
      },
    };
  }
};

const assertGuestbookConfigured = () => {
  if (!hasGuestbookServerConfig()) {
    throw new Error('GUESTBOOK_NOT_CONFIGURED');
  }
};

const assertModerationStatus = (
  status: unknown,
): status is GuestbookModerationStatus =>
  status === 'published' || status === 'hidden' || status === 'deleted';

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

    const snapshot = await query
      .limitToLast(batchSize + (boundary ? 1 : 0))
      .get();

    if (!snapshot.exists()) {
      exhausted = true;
      break;
    }

    let batch = getSnapshotMessages(snapshot);

    if (boundary) {
      batch = batch.filter(
        (message) =>
          message.created_at < boundary!.created_at ||
          (message.created_at === boundary!.created_at &&
            message.id !== boundary!.id),
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
  const nextCursor =
    hasMore && messages.length > 0
      ? encodeCursor({
          created_at: messages[0].created_at,
          id: messages[0].id,
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

const buildGuestbookRecord = (
  token: DecodedIdToken,
  message: string,
): GuestbookMessageRecord => {
  const now = Date.now();
  const isoDate = new Date(now).toISOString();

  return {
    createdAt: now,
    created_at: isoDate,
    deletedAt: null,
    deleted_at: null,
    email: token.email || '',
    id: '',
    image:
      (typeof token.picture === 'string' && token.picture) ||
      SITE_PROFILE_IMAGE,
    is_show: true,
    message,
    name:
      (typeof token.name === 'string' && token.name) ||
      token.email?.split('@')[0] ||
      'Guest',
    status: 'published',
    uid: token.uid,
    updatedAt: now,
    updated_at: isoDate,
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
    const current =
      currentValue && typeof currentValue === 'object'
        ? (currentValue as Record<string, unknown>)
        : null;

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
  message: string;
}) => {
  assertGuestbookConfigured();

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error('INVALID_MESSAGE');
  }

  if (trimmedMessage.length > 500) {
    throw new Error('MESSAGE_TOO_LONG');
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
