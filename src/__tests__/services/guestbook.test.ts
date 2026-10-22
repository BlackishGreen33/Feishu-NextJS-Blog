/** @jest-environment node */
import { fetchGuestbookMessages } from '@/services/guestbook';

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

it('validates guestbook responses and preserves server error messages', async () => {
  const page = {
    configured: false,
    hasMore: false,
    messages: [],
    nextCursor: null,
    viewer: { canModerate: false, isAuthenticated: false, uid: null },
  };
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => page })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...page, messages: 'invalid' }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Sign in first' }),
    }) as typeof fetch;
  await expect(fetchGuestbookMessages({})).resolves.toEqual(page);
  await expect(fetchGuestbookMessages({})).rejects.toMatchObject({
    name: 'ZodError',
  });
  await expect(fetchGuestbookMessages({})).rejects.toThrow('Sign in first');
});
