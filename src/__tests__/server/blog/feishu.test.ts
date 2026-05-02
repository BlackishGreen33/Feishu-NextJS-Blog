import {
  FeishuClient,
  formatFeishuApiErrorMessage,
} from '@/server/blog/feishu';

const createJsonResponse = (
  body: unknown,
  options: { headers?: HeadersInit; status?: number } = {},
) =>
  ({
    ok: !options.status || (options.status >= 200 && options.status < 300),
    status: options.status || 200,
    headers: new Headers(options.headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

const createAssetResponse = (
  body: string,
  options: { headers?: HeadersInit; status?: number } = {},
) => {
  const buffer = Buffer.from(body);

  return {
    ok: !options.status || (options.status >= 200 && options.status < 300),
    status: options.status || 200,
    headers: new Headers(options.headers),
    arrayBuffer: async () =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
    text: async () => body,
  } as Response;
};

describe('formatFeishuApiErrorMessage', () => {
  it('adds actionable guidance for wiki permission failures', () => {
    const message = formatFeishuApiErrorMessage(
      {
        code: 131006,
        msg: 'permission denied: wiki space permission denied, tenant needs read permission.',
        error: {
          log_id: 'log-123',
          troubleshooter: 'https://open.feishu.cn/search?...',
        },
      },
      { status: 400 },
    );

    expect(message).toContain('Feishu API error 400: code=131006');
    expect(message).toContain(
      'Grant the app access to the target Feishu wiki space before syncing.',
    );
    expect(message).toContain('log_id=log-123');
  });
});

describe('FeishuClient rate limit retries', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(global, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      _timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function') {
        handler(...args);
      }

      return 0;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as { fetch?: typeof fetch }).fetch;
    }
    jest.restoreAllMocks();
  });

  it('retries regular API requests after an HTTP 429 response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          tenant_access_token: 'tok',
          expire: 3600,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          { code: 99991400, msg: 'too many requests' },
          { headers: { 'retry-after': '1' }, status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            document: {
              document_id: 'doc-1',
              title: 'Doc',
            },
          },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    const client = new FeishuClient('app-http-429', 'secret');
    await expect(client.getDocumentInfo('doc-1')).resolves.toEqual(
      expect.objectContaining({
        document_id: 'doc-1',
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('retries regular API requests after a rate-limit payload', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          tenant_access_token: 'tok',
          expire: 3600,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 99991400,
          msg: 'rate limit exceeded',
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          data: {
            document: {
              document_id: 'doc-1',
              title: 'Doc',
            },
          },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    const client = new FeishuClient('app-payload-429', 'secret');
    await expect(client.getDocumentInfo('doc-1')).resolves.toEqual(
      expect.objectContaining({
        title: 'Doc',
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it('retries asset downloads after an HTTP 429 response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          code: 0,
          tenant_access_token: 'tok',
          expire: 3600,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          { code: 99991400, msg: 'too many requests' },
          { headers: { 'retry-after': '1' }, status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        createAssetResponse('asset-body', {
          headers: {
            'content-disposition': 'attachment; filename="image.png"',
            'content-type': 'image/png',
          },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    const client = new FeishuClient('app-asset-429', 'secret');
    const result = await client.downloadAsset({
      token: 'img-token',
      type: 'image',
    });

    expect(Buffer.from(result.body).toString()).toContain('asset-body');
    expect(result.contentType).toBe('image/png');
    expect(result.contentDisposition).toBe('attachment; filename="image.png"');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
