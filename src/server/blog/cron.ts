import { NextApiRequest } from 'next';

export const authorizeCronRequest = (req: NextApiRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
};
