import { NextApiRequest } from 'next';

export const authorizeCronRequest = (req: NextApiRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret) {
    return true;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return req.headers['x-vercel-cron'] === '1';
};
