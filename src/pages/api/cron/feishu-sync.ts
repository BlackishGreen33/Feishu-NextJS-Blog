import type { NextApiRequest, NextApiResponse } from 'next';

import { authorizeCronRequest } from '@/server/blog/cron';
import { syncFeishuArticles } from '@/server/blog/sync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!authorizeCronRequest(req)) {
    return res.status(401).json({ status: false, message: 'Unauthorized' });
  }

  try {
    const result = await syncFeishuArticles();
    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
