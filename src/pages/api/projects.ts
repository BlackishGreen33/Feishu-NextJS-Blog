import type { NextApiRequest, NextApiResponse } from 'next';

import { ProjectItemProps } from '@/common/types/projects';
import { getProjectsFromFirebase } from '@/server/firebase-db';

type Data = {
  status: boolean;
  data?: ProjectItemProps[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    const response = await getProjectsFromFirebase();
    res.status(200).json({ status: true, data: response });
  } catch (error) {
    res.status(200).json({
      status: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
