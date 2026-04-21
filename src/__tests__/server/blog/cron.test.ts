import { authorizeCronRequest } from '@/server/blog/cron';

describe('authorizeCronRequest', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
      return;
    }

    process.env.CRON_SECRET = originalCronSecret;
  });

  it('accepts requests with the matching bearer token', () => {
    process.env.CRON_SECRET = 'top-secret';

    expect(
      authorizeCronRequest({
        headers: {
          authorization: 'Bearer top-secret',
        },
      } as never),
    ).toBe(true);
  });

  it('rejects requests when the secret is missing', () => {
    delete process.env.CRON_SECRET;

    expect(
      authorizeCronRequest({
        headers: {
          authorization: 'Bearer top-secret',
        },
      } as never),
    ).toBe(false);
  });

  it('rejects mismatched bearer tokens', () => {
    process.env.CRON_SECRET = 'top-secret';

    expect(
      authorizeCronRequest({
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      } as never),
    ).toBe(false);
  });

  it('rejects requests without authorization headers', () => {
    process.env.CRON_SECRET = 'top-secret';

    expect(
      authorizeCronRequest({
        headers: {},
      } as never),
    ).toBe(false);
  });
});
