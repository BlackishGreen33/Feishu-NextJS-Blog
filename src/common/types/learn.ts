import type { z } from 'zod';

import type { lessonMetaSchema } from '@/common/schemas/learn';

export interface ContentLanguage {
  id: string;
  title: string;
}

export interface ContentProps {
  id: number;
  title: string;
  slug: string;
  description: string;
  image: string;
  is_new: boolean;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  is_show: boolean;
}

export interface SubContentProps {
  parent: string;
  contentSlug: string;
  subContentSlug: string;
  title: string;
  language?: string;
  difficulty?: string;
}

export type SubContentMetaProps = z.infer<typeof lessonMetaSchema>;

export interface MdxFileContentProps {
  slug: string;
  frontMatter: SubContentMetaProps;
  content: string;
}

export interface ChapterGroupProps {
  chapter_id: number | undefined;
  chapter_title: string;
  contents: MdxFileContentProps[];
}
