/** @jest-environment node */
import axios from 'axios';

import { getBlogComment } from '@/services/devto';

jest.mock('axios');
jest.mock('@/common/config/site', () => ({ SITE_DEVTO_USERNAME: 'example' }));

it('encodes the article association and rejects malformed comment data', async () => {
  jest
    .mocked(axios.get)
    .mockResolvedValueOnce({ status: 200, data: [] })
    .mockResolvedValueOnce({ status: 200, data: [{ id_code: 'broken' }] });
  await expect(getBlogComment({ post_id: '123&other=456' })).resolves.toEqual({
    status: 200,
    data: [],
  });
  expect(axios.get).toHaveBeenCalledWith(
    'https://dev.to/api/comments/?a_id=123%26other%3D456',
    expect.any(Object),
  );
  await expect(getBlogComment({ post_id: '123' })).rejects.toThrow();
});
