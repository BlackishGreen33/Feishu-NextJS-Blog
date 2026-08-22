/** @jest-environment node */

import { FeishuClient } from '@/server/blog/feishu';
import {
  createFeishuDocumentSubscriptionReconciler,
  ensureFeishuDocumentEventSubscriptions,
} from '@/server/blog/feishu-subscriptions';
import { getServerEnv } from '@/server/env';

jest.mock('@/server/blog/feishu', () => ({ FeishuClient: jest.fn() }));
jest.mock('@/server/env', () => ({ getServerEnv: jest.fn() }));

const mockedFeishuClient = jest.mocked(FeishuClient);
const mockedGetServerEnv = jest.mocked(getServerEnv);

describe('createFeishuDocumentSubscriptionReconciler', () => {
  it('subscribes every discovered docx and reports individual failures', async () => {
    const client = {
      listDocNodesBySpace: jest
        .fn()
        .mockResolvedValue([
          { obj_token: 'doc-1' },
          { obj_token: 'doc-2' },
          { obj_token: 'doc-3' },
        ]),
      subscribeToDocumentEvents: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('forbidden'))
        .mockResolvedValueOnce(undefined),
    };
    const reconcile = createFeishuDocumentSubscriptionReconciler({
      client,
      spaceId: 'space-1',
    });

    await expect(reconcile()).resolves.toEqual({
      totalDocuments: 3,
      subscribedDocuments: 2,
      failedDocuments: 1,
      failures: [{ fileToken: 'doc-2', message: 'forbidden' }],
    });

    expect(client.subscribeToDocumentEvents.mock.calls).toEqual([
      ['doc-1'],
      ['doc-2'],
      ['doc-3'],
    ]);
  });

  it('normalizes non-Error subscription failures', async () => {
    const client = {
      listDocNodesBySpace: jest
        .fn()
        .mockResolvedValue([{ obj_token: 'doc-1' }]),
      subscribeToDocumentEvents: jest.fn().mockRejectedValue('forbidden'),
    };
    const reconcile = createFeishuDocumentSubscriptionReconciler({
      client,
      spaceId: 'space-1',
    });

    await expect(reconcile()).resolves.toMatchObject({
      failedDocuments: 1,
      failures: [{ fileToken: 'doc-1', message: 'Unknown subscription error' }],
    });
  });
});

describe('ensureFeishuDocumentEventSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips reconciliation when Feishu configuration is incomplete', async () => {
    mockedGetServerEnv.mockReturnValue({
      feishu: { appId: '', appSecret: '', spaceId: '' },
    } as ReturnType<typeof getServerEnv>);

    await expect(ensureFeishuDocumentEventSubscriptions()).resolves.toEqual({
      skipped: true,
      reason: 'Missing Feishu configuration',
    });

    expect(mockedFeishuClient).not.toHaveBeenCalled();
  });

  it('uses the configured app to reconcile every document', async () => {
    const listDocNodesBySpace = jest
      .fn()
      .mockResolvedValue([{ obj_token: 'doc-1' }]);
    const subscribeToDocumentEvents = jest.fn().mockResolvedValue(undefined);
    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'secret',
        spaceId: 'space-1',
      },
    } as ReturnType<typeof getServerEnv>);
    mockedFeishuClient.mockImplementation(
      () =>
        ({
          listDocNodesBySpace,
          subscribeToDocumentEvents,
        }) as never,
    );

    await expect(ensureFeishuDocumentEventSubscriptions()).resolves.toEqual({
      totalDocuments: 1,
      subscribedDocuments: 1,
      failedDocuments: 0,
    });

    expect(mockedFeishuClient).toHaveBeenCalledWith('cli_test', 'secret');
    expect(listDocNodesBySpace).toHaveBeenCalledWith('space-1');
  });

  it('logs subscription reasons privately without exposing file tokens', async () => {
    const errorLog = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'secret',
        spaceId: 'space-1',
      },
    } as ReturnType<typeof getServerEnv>);
    mockedFeishuClient.mockImplementation(
      () =>
        ({
          listDocNodesBySpace: jest
            .fn()
            .mockResolvedValue([{ obj_token: 'private-doc-token' }]),
          subscribeToDocumentEvents: jest
            .fn()
            .mockRejectedValue(new Error('permission denied')),
        }) as never,
    );

    await ensureFeishuDocumentEventSubscriptions();

    expect(errorLog).toHaveBeenCalledWith(
      'Feishu document subscription failures',
      expect.objectContaining({
        failedDocuments: 1,
        messages: ['permission denied'],
      }),
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'private-doc-token',
    );
    errorLog.mockRestore();
  });
});
