import type { DecodedIdToken } from 'firebase-admin/auth';

import type { GuestbookViewer } from '@/common/types/chat';

import { getServerEnv } from '../env';
import { getFirebaseAdminAuth } from '../firebase-admin';

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
