import type { NextApiRequest, NextApiResponse } from 'next';

import {
  FeishuWebhookError,
  MAX_FEISHU_WEBHOOK_BYTES,
  parseFeishuWebhook,
} from '@/server/blog/feishu-webhook';
import { recordFeishuChange } from '@/server/blog/sync-trigger-production';
import { getServerEnv } from '@/server/env';

export const config = { api: { bodyParser: false } };

const readRawBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_FEISHU_WEBHOOK_BYTES) {
      throw new FeishuWebhookError('Feishu webhook payload is too large', 413);
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const getHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 1, message: 'Method not allowed' });
  }

  const {
    feishu: { appId, encryptKey, verificationToken },
    isVercel,
  } = getServerEnv();

  if (!appId || !verificationToken || (isVercel && !encryptKey)) {
    return res
      .status(503)
      .json({ code: 1, message: 'Feishu webhook is not configured' });
  }

  try {
    const event = parseFeishuWebhook({
      appId,
      encryptKey,
      headers: {
        nonce: getHeader(req.headers['x-lark-request-nonce']),
        signature: getHeader(req.headers['x-lark-signature']),
        timestamp: getHeader(req.headers['x-lark-request-timestamp']),
      },
      rawBody: await readRawBody(req),
      verificationToken,
    });

    if (event.kind === 'challenge') {
      return res.status(200).json({ challenge: event.challenge });
    }

    if (event.kind === 'file-edited') {
      try {
        await recordFeishuChange({
          eventId: event.eventId,
          fileToken: event.fileToken,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Unable to persist Feishu event',
          error instanceof Error ? error.message : 'Unknown error',
        );
        return res
          .status(503)
          .json({ code: 1, message: 'Unable to persist Feishu event' });
      }
    }

    return res.status(200).json({ code: 0 });
  } catch (error) {
    if (error instanceof FeishuWebhookError) {
      return res
        .status(error.statusCode)
        .json({ code: 1, message: error.message });
    }

    return res.status(400).json({ code: 1, message: 'Invalid Feishu event' });
  }
}
