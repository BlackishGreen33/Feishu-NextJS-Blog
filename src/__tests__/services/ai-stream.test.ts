/** @jest-environment node */

jest.mock('axios');
const originalFetch = global.fetch;
const originalKey = process.env.MINIMAX_API_KEY;
beforeEach(() => {
  jest.resetModules();
  process.env.MINIMAX_API_KEY = 'test-key';
});
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.MINIMAX_API_KEY;
  else process.env.MINIMAX_API_KEY = originalKey;
});

const stream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

it('returns the provider cancellation contract when fetch aborts before headers', async () => {
  const { streamChatPrompt } = await import('@/server/ai/provider');
  global.fetch = jest
    .fn()
    .mockRejectedValue(
      Object.assign(new Error('cancelled'), { name: 'AbortError' }),
    ) as typeof fetch;
  await expect(
    streamChatPrompt({ prompt: 'hello', onChunk: jest.fn() }),
  ).resolves.toMatchObject({ status: 499 });
});

it('reads browser chunks through EOF and notifies completion once', async () => {
  const { sendMessageStream } = await import('@/services/ai');
  const chunk = jest.fn();
  const done = jest.fn();
  const error = jest.fn();
  global.fetch = jest
    .fn()
    .mockResolvedValue(
      new Response(
        stream(
          'data: {"type":"chunk","value":"hello"}\r\n\r\ndata: {"type":"done"}',
        ),
      ),
    ) as typeof fetch;
  await sendMessageStream({
    prompt: 'hello',
    onChunk: chunk,
    onComplete: done,
    onError: error,
  });
  expect(chunk).toHaveBeenCalledWith('hello');
  expect(done).toHaveBeenCalledTimes(1);
  expect(error).not.toHaveBeenCalled();
});

it('suppresses completion after an SSE error and stays quiet on user cancellation', async () => {
  const { sendMessageStream } = await import('@/services/ai');
  const done = jest.fn();
  const error = jest.fn();
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      new Response(stream('data: {"type":"error","message":"failed"}\n\n')),
    )
    .mockRejectedValueOnce(
      Object.assign(new Error('cancelled'), { name: 'AbortError' }),
    ) as typeof fetch;
  await sendMessageStream({
    prompt: 'hello',
    onChunk: jest.fn(),
    onComplete: done,
    onError: error,
  });
  expect(error).toHaveBeenCalledWith('failed');
  expect(done).not.toHaveBeenCalled();
  error.mockClear();
  await sendMessageStream({
    prompt: 'hello',
    onChunk: jest.fn(),
    onComplete: done,
    onError: error,
  });
  expect(error).not.toHaveBeenCalled();
  expect(done).not.toHaveBeenCalled();
});

it('parses provider UTF-8 byte chunks, cumulative deltas and EOF', async () => {
  const { streamChatPrompt } = await import('@/server/ai/provider');
  const bytes = new TextEncoder().encode(
    'data: {"choices":[{"delta":{"content":"你好"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"你好世界"}}]}',
  );
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  global.fetch = jest
    .fn()
    .mockResolvedValue(new Response(body)) as typeof fetch;
  const chunks: string[] = [];
  await expect(
    streamChatPrompt({
      prompt: 'hello',
      onChunk: (value) => chunks.push(value),
    }),
  ).resolves.toMatchObject({ status: 200, data: { reply: '你好世界' } });
  expect(chunks).toEqual(['你好', '世界']);
});

it('keeps provider error, empty-content and missing-key responses', async () => {
  const { streamChatPrompt, postChatPrompt } =
    await import('@/server/ai/provider');
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'limited' } }), {
        status: 429,
      }),
    )
    .mockResolvedValueOnce(
      new Response(stream('data: [DONE]\n\n')),
    ) as typeof fetch;
  await expect(
    streamChatPrompt({ prompt: 'hello', onChunk: jest.fn() }),
  ).resolves.toMatchObject({ status: 429, message: 'limited' });
  await expect(
    streamChatPrompt({ prompt: 'hello', onChunk: jest.fn() }),
  ).resolves.toMatchObject({ status: 502 });
  const axios = (await import('axios')).default;
  jest.mocked(axios.post).mockResolvedValueOnce({
    status: 200,
    data: {
      choices: [{ message: { content: [{ type: 'text', text: 'reply' }] } }],
    },
  });
  await expect(postChatPrompt({ prompt: 'hello' })).resolves.toMatchObject({
    data: { reply: 'reply' },
  });
  delete process.env.MINIMAX_API_KEY;
  await expect(
    streamChatPrompt({ prompt: 'hello', onChunk: jest.fn() }),
  ).resolves.toMatchObject({
    status: 500,
    message: 'MiniMax API 未配置，請先設定 MINIMAX_API_KEY。',
  });
});

it('returns provider cancellation after receiving a chunk', async () => {
  const { streamChatPrompt } = await import('@/server/ai/provider');
  const abort = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
        ),
      );
      abort.signal.addEventListener('abort', () =>
        controller.error(new DOMException('cancelled', 'AbortError')),
      );
    },
  });
  global.fetch = jest
    .fn()
    .mockResolvedValue(new Response(body)) as typeof fetch;
  await expect(
    streamChatPrompt({
      prompt: 'hi',
      signal: abort.signal,
      onChunk: () => abort.abort(),
    }),
  ).resolves.toMatchObject({ status: 499 });
});

it('ignores malformed browser frames and reads multiline JSON across byte chunks', async () => {
  const { sendMessageStream } = await import('@/services/ai');
  const bytes = new TextEncoder().encode(
    'data: {"type":"chunk","value":42}\r\n\r\ndata: {"type":"chunk",\r\ndata: "value":"ok"}\r\n\r\ndata: [DONE]',
  );
  global.fetch = jest.fn().mockResolvedValue(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
          controller.close();
        },
      }),
    ),
  ) as typeof fetch;
  const chunk = jest.fn();
  const done = jest.fn();
  await sendMessageStream({ prompt: 'hi', onChunk: chunk, onComplete: done });
  expect(chunk.mock.calls).toEqual([['ok']]);
  expect(done).toHaveBeenCalledTimes(1);
});
