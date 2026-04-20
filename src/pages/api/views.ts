import { NextApiRequest, NextApiResponse } from 'next';

import {
  getViewsFromFirebase,
  incrementViewsInFirebase,
} from '@/server/firebase-db';

interface ResponseData {
  views: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { slug } = req.query;

  if (req.method === 'GET') {
    try {
      const contentViewsCount = await getViewsFromFirebase(String(slug));

      const response: ResponseData = {
        views: contentViewsCount,
      };

      return res.json(response);
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to fetch content meta' });
    }
  } else if (req.method === 'POST') {
    try {
      const views = await incrementViewsInFirebase(String(slug));
      return res.json({ views });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to update views count' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
