import { NextApiRequest, NextApiResponse } from 'next';

import { loadMdxFiles } from '@/common/libs/mdx';
import { learnCategorySchema } from '@/common/schemas/learn';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const category = learnCategorySchema.parse(req.query.category);
  const contentList = loadMdxFiles(category);

  const data = contentList.map((item) => ({
    id: item?.frontMatter?.id,
    parent_slug: category || '',
    slug: item.slug || '',
    title: item.frontMatter.title || '',
  }));

  const response = { data };

  res.status(200).json(response);
}
