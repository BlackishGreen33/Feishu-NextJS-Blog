import type { User } from 'firebase/auth';

import {
  GuestbookMessageMutationResponse,
  GuestbookMessagesPage,
  GuestbookModerationStatus,
} from '@/common/types/chat';

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

const requestGuestbookApi = async <T>({
  body,
  method = 'GET',
  url,
  user,
}: GuestbookRequestOptions): Promise<T> => {
  const headers = await getAuthorizationHeader(user);
  const response = await fetch(url, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    method,
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Guestbook request failed.');
  }

  return payload;
};

export const fetchGuestbookMessages = async ({
  cursor,
  limit,
  user,
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

  return requestGuestbookApi<GuestbookMessagesPage>({ url, user });
};

export const createGuestbookMessage = async ({
  message,
  user,
}: {
  message: string;
  user?: User | null;
}) =>
  requestGuestbookApi<GuestbookMessageMutationResponse>({
    body: { message },
    method: 'POST',
    url: '/api/guestbook/messages',
    user,
  });

export const deleteGuestbookMessage = async ({
  id,
  user,
}: {
  id: string;
  user?: User | null;
}) =>
  requestGuestbookApi<GuestbookMessageMutationResponse>({
    method: 'DELETE',
    url: `/api/guestbook/messages/${id}`,
    user,
  });

export const moderateGuestbookMessage = async ({
  id,
  status,
  user,
}: {
  id: string;
  status: GuestbookModerationStatus;
  user?: User | null;
}) =>
  requestGuestbookApi<GuestbookMessageMutationResponse>({
    body: { status },
    method: 'PATCH',
    url: `/api/guestbook/messages/${id}/moderation`,
    user,
  });
