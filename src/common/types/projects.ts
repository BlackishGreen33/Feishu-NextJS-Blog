import type { z } from 'zod';

import type { projectSchema } from '@/common/schemas/projects';

export type ProjectItemProps = z.infer<typeof projectSchema>;

export interface ProjectsProps {
  projects: ProjectItemProps[];
}
