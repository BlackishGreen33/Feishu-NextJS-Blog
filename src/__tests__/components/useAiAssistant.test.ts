import { act, renderHook } from '@testing-library/react';

import { useAiAssistant } from '@/modules/cmdpallete/hooks/useAiAssistant';
import { sendMessageStream } from '@/services/ai';

jest.mock('@/services/ai', () => ({ sendMessageStream: jest.fn() }));

it('cancels closed requests and ignores their callbacks after another request starts', async () => {
  const calls: Array<Parameters<typeof sendMessageStream>[0]> = [];
  jest.mocked(sendMessageStream).mockImplementation(async (input) => {
    calls.push(input);
  });
  const { result } = renderHook(() => useAiAssistant({ prompt: 'question' }));
  await act(async () => {
    await result.current.handleAskAiAssistant();
  });
  const first = calls[0];
  if (!first) throw new Error('Missing first request');
  act(() => {
    first.onChunk('old');
  });
  expect(result.current.aiResponse).toBe('old');
  act(() => {
    result.current.handleAiClose();
  });
  expect(first.signal?.aborted).toBe(true);
  await act(async () => {
    await result.current.handleAskAiAssistant();
  });
  act(() => {
    first.onChunk('stale');
    first.onComplete?.();
  });
  expect(result.current.aiResponse).toBe('');
  expect(result.current.aiStreaming).toBe(true);
  const second = calls[1];
  if (!second) throw new Error('Missing second request');
  act(() => {
    second.onChunk('new');
    second.onComplete?.();
  });
  expect(result.current.aiResponse).toBe('new');
  expect(result.current.aiStreaming).toBe(false);
});
