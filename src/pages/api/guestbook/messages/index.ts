import type { NextApiRequest, NextApiResponse } from 'next';

import {
  createGuestbookMessage,
  listGuestbookMessages,
} from '@/server/guestbook';

const getStatusCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'UNAUTHORIZED':
      return 401;
    case 'INVALID_MESSAGE':
    case 'MESSAGE_TOO_LONG':
      return 400;
    case 'RATE_LIMITED':
      return 429;
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
      return 'Please sign in before sending a message.';
    case 'INVALID_MESSAGE':
      return 'Message content is required.';
    case 'MESSAGE_TOO_LONG':
      return 'Message is too long.';
    case 'RATE_LIMITED':
      return 'You are sending messages too quickly. Please try again later.';
    case 'GUESTBOOK_NOT_CONFIGURED':
      return 'Guestbook is not configured yet.';
    default:
      return 'Guestbook request failed.';
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === 'GET') {
      const limit =
        typeof req.query.limit === 'string'
          ? Number(req.query.limit)
          : undefined;
      const cursor =
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

      res.setHeader('Cache-Control', 'private, no-store');

      return res.status(200).json(
        await listGuestbookMessages({
          authorizationHeader: req.headers.authorization,
          cursor,
          limit,
        }),
      );
    }

    if (req.method === 'POST') {
      const payload = await createGuestbookMessage({
        authorizationHeader: req.headers.authorization,
        message: typeof req.body?.message === 'string' ? req.body.message : '',
      });

      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(201).json(payload);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      error: getErrorMessage(error),
    });
  }
}
