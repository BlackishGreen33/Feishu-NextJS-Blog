/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/cron/feishu-sync';
import { authorizeCronRequest } from '@/server/blog/cron';
import { ensureFeishuDocumentEventSubscriptions } from '@/server/blog/feishu-subscriptions';
import { runScheduledFeishuSync } from '@/server/blog/sync-trigger-production';

jest.mock('@/server/blog/cron', () => ({
  authorizeCronRequest: jest.fn(),
}));
jest.mock('@/server/blog/feishu-subscriptions', () => ({
  ensureFeishuDocumentEventSubscriptions: jest.fn(),
}));
jest.mock('@/server/blog/sync-trigger-production', () => ({
  runScheduledFeishuSync: jest.fn(),
}));

const mockedAuthorizeCronRequest = jest.mocked(authorizeCronRequest);
const mockedEnsureSubscriptions = jest.mocked(
  ensureFeishuDocumentEventSubscriptions,
);
const mockedRunScheduledSync = jest.mocked(runScheduledFeishuSync);

type MockApiResponse = NextApiResponse & {
  headers: Record<string, unknown>;
  statusCode: number;
  payload: unknown;
};

const createResponse = () => {
  const response = {} as MockApiResponse;
  response.headers = {};
  response.statusCode = 200;
  response.payload = undefined;
  response.setHeader = jest.fn((name: string, value: unknown) => {
    response.headers[name] = value;
    return response;
  });
  response.status = jest.fn((statusCode: number) => {
    response.statusCode = statusCode;
    return response;
  });
  response.json = jest.fn((payload: unknown) => {
    response.payload = payload;
    return response;
  });
  return response;
};

describe('/api/cron/feishu-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthorizeCronRequest.mockReturnValue(true);
    mockedEnsureSubscriptions.mockResolvedValue({
      totalDocuments: 9,
      subscribedDocuments: 9,
      failedDocuments: 0,
    });
    mockedRunScheduledSync.mockResolvedValue({
      status: 'synced',
      generation: 4,
      result: { storage: 'blob', changedArticles: 1 },
    });
  });

  it('reconciles subscriptions and runs the fallback sync under the shared lease', async () => {
    const req = { headers: {} } as NextApiRequest;
    const res = createResponse();

    await handler(req, res);

    expect(mockedEnsureSubscriptions).toHaveBeenCalledTimes(1);
    expect(mockedRunScheduledSync).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      status: true,
      data: { storage: 'blob', changedArticles: 1 },
      trigger: { status: 'synced', generation: 4 },
      subscriptions: {
        totalDocuments: 9,
        subscribedDocuments: 9,
        failedDocuments: 0,
      },
    });
  });

  it('returns a retryable failure when another sync owns the lease', async () => {
    mockedRunScheduledSync.mockResolvedValue({
      status: 'locked',
      generation: 5,
    });
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(res.statusCode).toBe(503);
    expect(res.headers['Retry-After']).toBe('120');
    expect(res.payload).toEqual(
      expect.objectContaining({
        status: false,
        error: 'Another Feishu sync is already running',
        trigger: { status: 'locked', generation: 5 },
      }),
    );
  });

  it('reports subscription reconciliation failure without blocking content sync', async () => {
    mockedEnsureSubscriptions.mockRejectedValue(
      new Error('event permission missing'),
    );
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(mockedRunScheduledSync).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(
      expect.objectContaining({
        subscriptions: {
          failed: true,
          message: 'Subscription reconciliation failed',
        },
      }),
    );
  });

  it('normalizes non-Error subscription failures', async () => {
    mockedEnsureSubscriptions.mockRejectedValue('permission missing');
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(res.payload).toEqual(
      expect.objectContaining({
        subscriptions: {
          failed: true,
          message: 'Subscription reconciliation failed',
        },
      }),
    );
  });

  it('returns an explicit failure when the safety-net sync fails', async () => {
    mockedRunScheduledSync.mockRejectedValue(new Error('blob unavailable'));
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({
      status: false,
      error: 'Feishu sync failed',
    });
  });

  it('normalizes non-Error sync failures', async () => {
    mockedRunScheduledSync.mockRejectedValue('blob unavailable');
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({
      status: false,
      error: 'Feishu sync failed',
    });
  });

  it('rejects unauthorized requests before touching Feishu', async () => {
    mockedAuthorizeCronRequest.mockReturnValue(false);
    const res = createResponse();

    await handler({ headers: {} } as NextApiRequest, res);

    expect(res.statusCode).toBe(401);
    expect(mockedEnsureSubscriptions).not.toHaveBeenCalled();
    expect(mockedRunScheduledSync).not.toHaveBeenCalled();
  });
});
