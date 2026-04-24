import { NextApiRequest } from 'next';

import { getServerEnv } from '@/server/env';

export const authorizeCronRequest = (req: NextApiRequest) => {
  const cronSecret = getServerEnv().cronSecret;
  const authHeader = req.headers.authorization;

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
};
