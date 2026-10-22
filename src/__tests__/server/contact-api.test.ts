/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

import handler from '@/pages/api/contact';

jest.mock('axios');
const key = process.env.CONTACT_FORM_API_KEY;
const invoke = async (body: unknown) => {
  let status = 0;
  let payload: unknown;
  const res = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: (data: unknown) => {
      payload = data;
      return res;
    },
  };
  await handler({ body } as NextApiRequest, res as unknown as NextApiResponse);
  return { status, payload };
};
beforeEach(() => {
  jest.resetAllMocks();
  process.env.CONTACT_FORM_API_KEY = 'server-key';
});
afterEach(() => {
  if (key === undefined) delete process.env.CONTACT_FORM_API_KEY;
  else process.env.CONTACT_FORM_API_KEY = key;
});
const formData = { name: 'Visitor', email: 'a@b', message: 'hello' };

it('forwards only contact fields and uses the server access key', async () => {
  jest.mocked(axios.post).mockImplementation(async (_url, data: unknown) => {
    expect(data).toBeInstanceOf(FormData);
    const submitted = data as FormData;
    expect(submitted.get('access_key')).toBe('server-key');
    expect(submitted.get('email')).toBe('a@b');
    expect(submitted.get('message')).toBe('hello');
    return { status: 200, data: { message: 'received' } };
  });
  await expect(
    invoke({ formData: { ...formData, access_key: 'untrusted-key' } }),
  ).resolves.toEqual({
    status: 200,
    payload: { status: 200, message: 'received' },
  });
});

it('rejects malformed requests and missing configuration without contacting the provider', async () => {
  jest
    .mocked(axios.post)
    .mockResolvedValue({ status: 200, data: { message: 'received' } });
  expect(
    (await invoke({ formData: { ...formData, message: 42 } })).status,
  ).toBe(500);
  delete process.env.CONTACT_FORM_API_KEY;
  expect((await invoke({ formData })).status).toBe(500);
  expect(axios.post).not.toHaveBeenCalled();
});

it('keeps the failure response for transport and malformed provider replies', async () => {
  jest
    .mocked(axios.post)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      status: 200,
      data: { message: { broken: true } },
    });
  await expect(invoke({ formData })).resolves.toEqual({
    status: 500,
    payload: { error: 'Something went wrong!' },
  });
  expect((await invoke({ formData })).status).toBe(500);
});
