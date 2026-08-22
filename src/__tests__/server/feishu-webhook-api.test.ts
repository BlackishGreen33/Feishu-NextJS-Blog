/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

import handler, { config } from '@/pages/api/webhooks/feishu';
import { recordFeishuChange } from '@/server/blog/sync-trigger-production';
import { getServerEnv } from '@/server/env';

jest.mock('@/server/blog/sync-trigger-production', () => ({
  recordFeishuChange: jest.fn(),
}));
jest.mock('@/server/env', () => ({ getServerEnv: jest.fn() }));

const mockedGetServerEnv = jest.mocked(getServerEnv);
const mockedRecordFeishuChange = jest.mocked(recordFeishuChange);

type MockApiResponse = NextApiResponse & {
  headers: Record<string, unknown>;
  statusCode: number;
  payload: unknown;
};

const createMockRequest = ({
  body,
  headers = {},
  method = 'POST',
}: {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
}) => {
  const request = Readable.from(body ? [body] : []) as NextApiRequest;
  request.headers = headers;
  request.method = method;
  return request;
};

const createMockResponse = () => {
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

describe('/api/webhooks/feishu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'app-secret',
        encryptKey: '',
        spaceId: 'space-id',
        verificationToken: 'verification-token',
      },
    } as ReturnType<typeof getServerEnv>);
    mockedRecordFeishuChange.mockResolvedValue({
      duplicate: false,
      generation: 1,
    });
  });

  it('disables Next.js body parsing so the raw signature body is preserved', () => {
    expect(config).toEqual({ api: { bodyParser: false } });
  });

  it('answers the Feishu URL verification challenge', async () => {
    const req = createMockRequest({
      body: JSON.stringify({
        challenge: 'challenge-value',
        token: 'verification-token',
        type: 'url_verification',
      }),
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ challenge: 'challenge-value' });
    expect(mockedRecordFeishuChange).not.toHaveBeenCalled();
  });

  it('persists an authenticated docx edit before acknowledging it', async () => {
    const req = createMockRequest({
      body: JSON.stringify({
        schema: '2.0',
        header: {
          app_id: 'cli_test',
          create_time: '1724313600000',
          event_id: 'event-1',
          event_type: 'drive.file.edit_v1',
          token: 'verification-token',
        },
        event: { file_token: 'docx-token', file_type: 'docx' },
      }),
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedRecordFeishuChange).toHaveBeenCalledWith({
      eventId: 'event-1',
      fileToken: 'docx-token',
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ code: 0 });
  });

  it('rejects invalid tokens without enqueuing work', async () => {
    const req = createMockRequest({
      body: JSON.stringify({
        schema: '2.0',
        header: {
          app_id: 'cli_test',
          event_id: 'event-1',
          event_type: 'drive.file.edit_v1',
          token: 'wrong-token',
        },
        event: { file_token: 'docx-token', file_type: 'docx' },
      }),
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(mockedRecordFeishuChange).not.toHaveBeenCalled();
  });

  it('returns a retryable response when durable enqueueing fails', async () => {
    mockedRecordFeishuChange.mockRejectedValue(new Error('queue unavailable'));
    const req = createMockRequest({
      body: JSON.stringify({
        schema: '2.0',
        header: {
          app_id: 'cli_test',
          event_id: 'event-1',
          event_type: 'drive.file.edit_v1',
          token: 'verification-token',
        },
        event: { file_token: 'docx-token', file_type: 'docx' },
      }),
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.payload).toEqual({
      code: 1,
      message: 'Unable to persist Feishu event',
    });
  });

  it('rejects unsupported methods and missing webhook configuration', async () => {
    const methodReq = createMockRequest({ method: 'GET' });
    const methodRes = createMockResponse();
    await handler(methodReq, methodRes);

    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'app-secret',
        encryptKey: '',
        spaceId: 'space-id',
        verificationToken: '',
      },
    } as ReturnType<typeof getServerEnv>);
    const configReq = createMockRequest({ body: '{}' });
    const configRes = createMockResponse();
    await handler(configReq, configRes);

    expect(methodRes.statusCode).toBe(405);
    expect(methodRes.headers.Allow).toBe('POST');
    expect(configRes.statusCode).toBe(503);
  });

  it('requires encrypted callbacks on Vercel', async () => {
    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'app-secret',
        encryptKey: '',
        spaceId: 'space-id',
        verificationToken: 'verification-token',
      },
      isVercel: true,
    } as ReturnType<typeof getServerEnv>);
    const res = createMockResponse();

    await handler(
      createMockRequest({
        body: JSON.stringify({
          challenge: 'challenge-value',
          token: 'verification-token',
          type: 'url_verification',
        }),
      }),
      res,
    );

    expect(res.statusCode).toBe(503);
    expect(mockedRecordFeishuChange).not.toHaveBeenCalled();
  });

  it('accepts the plaintext URL challenge before encrypted delivery starts', async () => {
    mockedGetServerEnv.mockReturnValue({
      feishu: {
        appId: 'cli_test',
        appSecret: 'app-secret',
        encryptKey: 'encrypt-key',
        spaceId: 'space-id',
        verificationToken: 'verification-token',
      },
      isVercel: true,
    } as ReturnType<typeof getServerEnv>);
    const res = createMockResponse();

    await handler(
      createMockRequest({
        body: JSON.stringify({
          challenge: 'challenge-value',
          token: 'verification-token',
          type: 'url_verification',
        }),
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ challenge: 'challenge-value' });
  });
});
