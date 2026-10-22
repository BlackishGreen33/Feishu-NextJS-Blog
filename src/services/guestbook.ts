import type { User } from 'firebase/auth';

import {
  guestbookMutationSchema,
  guestbookPageSchema,
} from '@/common/schemas/guestbook';
import { GuestbookModerationStatus } from '@/common/types/chat';

type GuestbookRequestOptions = {
  body?: Record<string, unknown>;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  url: string;
  user?: User | null;
};

const getAuthorizationHeader = async (user?: User | null) => {
  const headers: Record<string, string> = {};

  if (!user) {
    return headers;
  }

  const idToken = await user.getIdToken();
  headers.Authorization = `Bearer ${idToken}`;
  return headers;
};

const requestGuestbookApi = async <T>(
  { body, method = 'GET', url, user }: GuestbookRequestOptions,
  parse: (value: unknown) => T,
): Promise<T> => {
  const headers = await getAuthorizationHeader(user);
  const response = await fetch(url, {
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    method,
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : '';
    throw new Error(message || 'Guestbook request failed.');
  }

  return parse(payload);
};

export const fetchGuestbookMessages = async ({
  cursor,
  limit,
  user = null,
}: {
  cursor?: string | null;
  limit?: number;
  user?: User | null;
}) => {
  const searchParams = new URLSearchParams();

  if (cursor) {
    searchParams.set('cursor', cursor);
  }

  if (limit) {
    searchParams.set('limit', String(limit));
  }

  const query = searchParams.toString();
  const url = query
    ? `/api/guestbook/messages?${query}`
    : '/api/guestbook/messages';

  return requestGuestbookApi({ url, user }, guestbookPageSchema.parse);
};

export const createGuestbookMessage = async ({
  message,
  user = null,
}: {
  message: string;
  user?: User | null;
}) =>
  requestGuestbookApi(
    {
      body: { message },
      method: 'POST',
      url: '/api/guestbook/messages',
      user,
    },
    guestbookMutationSchema.parse,
  );

export const deleteGuestbookMessage = async ({
  id,
  user = null,
}: {
  id: string;
  user?: User | null;
}) =>
  requestGuestbookApi(
    {
      method: 'DELETE',
      url: `/api/guestbook/messages/${id}`,
      user,
    },
    guestbookMutationSchema.parse,
  );

export const moderateGuestbookMessage = async ({
  id,
  status,
  user = null,
}: {
  id: string;
  status: GuestbookModerationStatus;
  user?: User | null;
}) =>
  requestGuestbookApi(
    {
      body: { status },
      method: 'PATCH',
      url: `/api/guestbook/messages/${id}/moderation`,
      user,
    },
    guestbookMutationSchema.parse,
  );
