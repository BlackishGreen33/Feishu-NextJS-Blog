import { NextApiRequest, NextApiResponse } from 'next';

import { getMdxFileCount } from '@/common/libs/mdx';
import { learnCategorySchema } from '@/common/schemas/learn';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const slug = learnCategorySchema.parse(req.query.slug);
  const count = getMdxFileCount(slug);

  res.status(200).json({ count });
}
