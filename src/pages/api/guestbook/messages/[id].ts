import type { NextApiRequest, NextApiResponse } from 'next';

import { deleteGuestbookMessage } from '@/server/guestbook';

const getStatusCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
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
      return 'Please sign in before deleting a message.';
    case 'FORBIDDEN':
      return 'You do not have permission to delete this message.';
    case 'NOT_FOUND':
      return 'Message not found.';
    case 'GUESTBOOK_NOT_CONFIGURED':
      return 'Guestbook is not configured yet.';
    default:
      return 'Unable to delete the message.';
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';

    const payload = await deleteGuestbookMessage({
      authorizationHeader: req.headers.authorization,
      id,
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      error: getErrorMessage(error),
    });
  }
}
