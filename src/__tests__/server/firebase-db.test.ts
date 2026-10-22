/** @jest-environment node */

import { isSerializableProps } from 'next/dist/lib/is-serializable-props';
import type { Database } from 'firebase-admin/database';

import { getFirebaseAdminDatabase } from '@/server/firebase-admin';
import {
  getProjectBySlugFromFirebase,
  getProjectsFromFirebase,
} from '@/server/firebase-db';

jest.mock('@/server/firebase-admin', () => ({
  getFirebaseAdminDatabase: jest.fn(),
}));

const projectData = {
  legacy: {
    title: 'Legacy project',
    slug: 'legacy',
    content: '# Legacy project details',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  recent: {
    title: 'Recent project',
    slug: 'recent',
    is_show: true,
    updated_at: '2026-10-01T00:00:00.000Z',
  },
  featured: {
    title: 'Featured project',
    slug: 'featured',
    is_show: true,
    is_featured: true,
    stacks: ['TypeScript'],
  },
  hidden: { title: 'Hidden project', slug: 'hidden', is_show: false },
  invalid: { slug: 'invalid', is_show: true },
};

const mockedGetDatabase = jest.mocked(getFirebaseAdminDatabase);
const originalEnv = process.env;
const readProjects = jest.fn();
let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_FIREBASE_DB_URL: 'https://firebase.example.test',
  };
  fetchSpy = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response('{"error":"Permission denied"}', { status: 401 }),
    );
  readProjects.mockReset().mockResolvedValue({ val: () => projectData });
  mockedGetDatabase.mockReturnValue({
    ref: (pathname: string) => {
      if (pathname !== 'projects') throw new Error('Unexpected database path');
      return { get: readProjects };
    },
  } as unknown as Database);
});

afterEach(() => {
  process.env = originalEnv;
  fetchSpy.mockRestore();
  mockedGetDatabase.mockReset();
});

it('reads and sorts public projects when anonymous Firebase access is denied', async () => {
  const projects = await getProjectsFromFirebase();

  expect(projects.map(({ slug }) => slug)).toEqual([
    'featured',
    'recent',
    'legacy',
  ]);
  expect(projects[0]).toMatchObject({
    title: 'Featured project',
    stacks: '["TypeScript"]',
    is_show: true,
  });
});

it('returns public project details and excludes hidden or unknown slugs', async () => {
  await expect(getProjectBySlugFromFirebase('legacy')).resolves.toMatchObject({
    title: 'Legacy project',
    content: '# Legacy project details',
  });
  await expect(getProjectBySlugFromFirebase('hidden')).resolves.toBeNull();
  await expect(getProjectBySlugFromFirebase('missing')).resolves.toBeNull();
});

it('returns project data that Next.js can serialize into page props', async () => {
  const projects = await getProjectsFromFirebase();

  expect(() =>
    isSerializableProps('/projects', 'getStaticProps', { projects }),
  ).not.toThrow();
});

it('keeps the public REST fallback when Firebase Admin is not configured', async () => {
  mockedGetDatabase.mockReturnValue(null);
  fetchSpy.mockResolvedValue(new Response(JSON.stringify(projectData)));

  await expect(getProjectsFromFirebase()).resolves.toEqual([
    expect.objectContaining({ slug: 'featured' }),
    expect.objectContaining({ slug: 'recent' }),
    expect.objectContaining({ slug: 'legacy' }),
  ]);
});

it('returns an empty list when no Firebase database is configured', async () => {
  process.env.NEXT_PUBLIC_FIREBASE_DB_URL = '';

  await expect(getProjectsFromFirebase()).resolves.toEqual([]);
});

it('propagates authenticated database read failures', async () => {
  readProjects.mockRejectedValueOnce(new Error('Database unavailable'));

  await expect(getProjectsFromFirebase()).rejects.toThrow(
    'Database unavailable',
  );
});
