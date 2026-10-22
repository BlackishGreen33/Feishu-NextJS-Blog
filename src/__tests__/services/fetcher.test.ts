import axios from 'axios';
import { z } from 'zod';

import { fetchValidated } from '@/services/fetcher';

jest.mock('axios');
const get = jest.mocked(axios.get);

afterEach(() => jest.clearAllMocks());

it('validates unknown HTTP data while preserving schema extensions', async () => {
  get.mockResolvedValue({ data: { title: 'Article', extra: 1 } });
  await expect(
    fetchValidated('/article', z.looseObject({ title: z.string() }).parse),
  ).resolves.toEqual({ title: 'Article', extra: 1 });
});

it('rejects malformed data and preserves transport failures', async () => {
  get.mockResolvedValueOnce({ data: { title: false } });
  await expect(
    fetchValidated('/article', z.object({ title: z.string() }).parse),
  ).rejects.toMatchObject({ name: 'ZodError' });
  const error = new Error('offline');
  get.mockRejectedValueOnce(error);
  await expect(
    fetchValidated('/article', z.object({ title: z.string() }).parse),
  ).rejects.toBe(error);
});
