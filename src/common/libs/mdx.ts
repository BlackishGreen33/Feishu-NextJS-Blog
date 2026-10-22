import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';

import { learnCategorySchema, lessonMetaSchema } from '@/common/schemas/learn';
import type { MdxFileContentProps } from '@/common/types/learn';

const getLearnDirectory = (slug: unknown) =>
  path.join(
    process.cwd(),
    'src',
    'contents',
    'learn',
    learnCategorySchema.parse(slug),
  );

export const loadMdxFiles = (slug: string): MdxFileContentProps[] => {
  const dirPath = getLearnDirectory(slug);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath).filter((file) => file.endsWith('.mdx'));

  const contents = files.map((file) => {
    const filePath = path.join(dirPath, file);
    const source = fs.readFileSync(filePath, 'utf-8');
    const { content, data } = matter(source);

    const mdxCompiler = remark()
      .use(remarkParse as never)
      .use(remarkGfm as never)
      .use(remarkMdx as never);
    const mdxContent = mdxCompiler.processSync(content).toString();

    return {
      slug: file.replace('.mdx', ''),
      frontMatter: lessonMetaSchema.parse(data as unknown),
      content: mdxContent,
    };
  });

  return contents;
};

export const getMdxFileCount = (slug: string) => {
  const dirPath = getLearnDirectory(slug);
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));
  return mdxFiles.length;
};
