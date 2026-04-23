import { NextApiRequest, NextApiResponse } from 'next';

import { buildSiteChatContext } from '@/server/ai/context';
import { postChatPrompt, streamChatPrompt } from '@/services/ai';

export const config = {
  api: {
    responseLimit: false,
  },
};

const writeSSE = (res: NextApiResponse, payload: unknown) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, locale, currentPath, stream } = req.body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const context = await buildSiteChatContext({
      prompt,
      locale: typeof locale === 'string' ? locale : undefined,
      currentPath: typeof currentPath === 'string' ? currentPath : undefined,
    });

    if (stream === true) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders?.();

      const abortController = new AbortController();
      req.socket.on('close', () => abortController.abort());

      const response = await streamChatPrompt({
        prompt,
        context,
        signal: abortController.signal,
        onChunk: (chunk) => {
          writeSSE(res, { type: 'chunk', value: chunk });
        },
      });

      if (response?.status >= 400 && response?.status !== 499) {
        writeSSE(res, { type: 'error', message: response?.message });
      } else {
        writeSSE(res, { type: 'done' });
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const response = await postChatPrompt({
      prompt,
      context,
    });

    if (response?.status >= 400) {
      return res.status(response?.status).json({ error: response?.message });
    } else {
      return res.status(200).json({ reply: response?.data?.reply });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
