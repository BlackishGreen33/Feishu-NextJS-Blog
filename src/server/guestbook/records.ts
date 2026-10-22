import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DataSnapshot } from 'firebase-admin/database';
import type { z } from 'zod';

import { SITE_PROFILE_IMAGE } from '@/common/config/site';
import {
  guestbookCursorSchema,
  guestbookMessageSchema,
  legacyGuestbookRecordSchema,
} from '@/common/schemas/guestbook';
import type {
  GuestbookMessageRecord,
  GuestbookMessageStatus,
  MessageProps,
} from '@/common/types/chat';
type GuestbookCursor = z.infer<typeof guestbookCursorSchema>;

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

export const normalizeGuestbookMessage = (
  snapshotKey: string,
  value: unknown,
): MessageProps | null => {
  const parsed = legacyGuestbookRecordSchema.safeParse(value);
  if (!parsed.success) return null;
  const record = parsed.data;
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

  return guestbookMessageSchema.parse({
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
  });
};

export const sortGuestbookMessages = (
  left: Pick<MessageProps, 'created_at' | 'id'>,
  right: Pick<MessageProps, 'created_at' | 'id'>,
) => {
  if (left.created_at === right.created_at) {
    return left.id.localeCompare(right.id);
  }

  return left.created_at.localeCompare(right.created_at);
};

export const encodeCursor = (cursor: GuestbookCursor) =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

export const decodeCursor = (value?: string | null): GuestbookCursor | null => {
  if (!value) {
    return null;
  }

  try {
    const raw: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    const parsed = guestbookCursorSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }

  return null;
};

export const getSnapshotMessages = (snapshot: DataSnapshot) => {
  const messages: MessageProps[] = [];

  snapshot.forEach((child) => {
    const normalized = normalizeGuestbookMessage(child.key || '', child.val());

    if (normalized) {
      messages.push(normalized);
    }
  });

  return messages.sort(sortGuestbookMessages);
};

export const isMissingGuestbookIndexError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes('Index not defined') &&
  error.message.includes('created_at');

export const paginateVisibleMessages = ({
  cursor,
  messages,
  requestedLimit,
}: {
  cursor?: string | null;
  messages: MessageProps[];
  requestedLimit: number;
}) => {
  const boundary = decodeCursor(cursor);
  const visibleMessages = messages.filter(
    (message) => message.status === 'published',
  );
  const filteredMessages = boundary
    ? visibleMessages.filter(
        (message) => sortGuestbookMessages(message, boundary) < 0,
      )
    : visibleMessages;
  const pageMessages = filteredMessages.slice(-requestedLimit);
  const oldestMessage = pageMessages[0];
  const nextCursor =
    filteredMessages.length > requestedLimit && oldestMessage
      ? encodeCursor({
          created_at: oldestMessage.created_at,
          id: oldestMessage.id,
        })
      : null;

  return {
    hasMore: Boolean(nextCursor),
    messages: pageMessages,
    nextCursor,
  };
};

export const buildGuestbookRecord = (
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
