import type { NextApiRequest, NextApiResponse } from 'next';

import { moderateGuestbookMessage } from '@/server/guestbook';

const getStatusCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'INVALID_STATUS':
      return 400;
    case 'GUESTBOOK_NOT_CONFIGURED':
      return 503;
    default:
      return 500;
  }
};

const getErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'UNAUTHORIZED':
      return 'Please sign in before moderating messages.';
    case 'FORBIDDEN':
      return 'You do not have permission to moderate this message.';
    case 'NOT_FOUND':
      return 'Message not found.';
    case 'INVALID_STATUS':
      return 'Invalid moderation status.';
    case 'GUESTBOOK_NOT_CONFIGURED':
      return 'Guestbook is not configured yet.';
    default:
      return 'Unable to update the message status.';
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const payload = await moderateGuestbookMessage({
      authorizationHeader: req.headers.authorization,
      id,
      status: req.body?.status,
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      error: getErrorMessage(error),
    });
  }
}
