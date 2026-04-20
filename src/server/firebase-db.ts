import { ProjectItemProps } from '@/common/types/projects';

const PROJECTS_PATH = 'projects';
const CONTENT_META_PATH = 'contentmeta';

const getFirebaseDatabaseUrl = () =>
  process.env.NEXT_PUBLIC_FIREBASE_DB_URL?.trim().replace(/\/$/, '') || '';

const hasFirebaseDatabaseUrl = () => Boolean(getFirebaseDatabaseUrl());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFirebaseKey = (value: string) => encodeURIComponent(value);

const buildFirebaseUrl = (pathname: string) => {
  const databaseUrl = getFirebaseDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_DB_URL');
  }

  return `${databaseUrl}/${pathname}.json`;
};

const fetchFirebaseJson = async <T>(
  pathname: string,
  init: RequestInit = {},
) => {
  const response = await fetch(buildFirebaseUrl(pathname), {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Firebase DB error ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
};

const normalizeStacks = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return '[]';
};

const normalizeProject = (value: unknown): ProjectItemProps | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === 'string' ? value.title : '';
  const slug = typeof value.slug === 'string' ? value.slug : '';

  if (!title || !slug) {
    return null;
  }

  return {
    title,
    slug,
    description: typeof value.description === 'string' ? value.description : '',
    image: typeof value.image === 'string' ? value.image : '',
    link_demo:
      typeof value.link_demo === 'string' ? value.link_demo : undefined,
    link_github:
      typeof value.link_github === 'string' ? value.link_github : undefined,
    stacks: normalizeStacks(value.stacks),
    content: typeof value.content === 'string' ? value.content : undefined,
    is_show: typeof value.is_show === 'boolean' ? value.is_show : true,
    is_featured:
      typeof value.is_featured === 'boolean' ? value.is_featured : false,
    updated_at:
      typeof value.updated_at === 'string'
        ? value.updated_at
        : new Date(0).toISOString(),
  };
};

const sortProjects = (projects: ProjectItemProps[]) =>
  [...projects].sort((left, right) => {
    if (left.is_featured !== right.is_featured) {
      return Number(right.is_featured) - Number(left.is_featured);
    }

    return Date.parse(right.updated_at) - Date.parse(left.updated_at);
  });

export const getProjectsFromFirebase = async () => {
  if (!hasFirebaseDatabaseUrl()) {
    return [];
  }

  const payload = await fetchFirebaseJson<unknown>(PROJECTS_PATH);
  const values = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? Object.values(payload)
      : [];

  return sortProjects(
    values
      .map((value) => normalizeProject(value))
      .filter((value): value is ProjectItemProps => Boolean(value)),
  );
};

export const getProjectBySlugFromFirebase = async (slug: string) => {
  const projects = await getProjectsFromFirebase();
  return projects.find((project) => project.slug === slug) || null;
};

const extractViews = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (isRecord(value) && typeof value.views === 'number') {
    return value.views;
  }

  return 0;
};

export const getViewsFromFirebase = async (slug: string) => {
  if (!hasFirebaseDatabaseUrl()) {
    return 0;
  }

  const payload = await fetchFirebaseJson<unknown>(
    `${CONTENT_META_PATH}/${toFirebaseKey(slug)}`,
  );

  return extractViews(payload);
};

export const incrementViewsInFirebase = async (slug: string) => {
  if (!hasFirebaseDatabaseUrl()) {
    return 0;
  }

  const pathname = `${CONTENT_META_PATH}/${toFirebaseKey(slug)}`;
  const current = await fetchFirebaseJson<unknown>(pathname);
  const nextViews = extractViews(current) + 1;
  const nextValue = isRecord(current)
    ? { ...current, slug, views: nextViews }
    : { slug, views: nextViews };

  await fetchFirebaseJson(pathname, {
    method: 'PUT',
    body: JSON.stringify(nextValue),
  });

  return nextViews;
};
