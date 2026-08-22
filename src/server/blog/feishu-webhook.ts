import crypto from 'crypto';

export const MAX_FEISHU_WEBHOOK_BYTES = 256 * 1024;
const FEISHU_WEBHOOK_REPLAY_WINDOW_MS = 10 * 60 * 1000;

type FeishuWebhookHeaders = {
  nonce?: string;
  signature?: string;
  timestamp?: string;
};

type ParseFeishuWebhookInput = {
  appId?: string;
  clock?: () => number;
  encryptKey?: string;
  headers?: FeishuWebhookHeaders;
  rawBody: string;
  verificationToken: string;
};

type FeishuWebhookPayload = {
  challenge?: unknown;
  event?: {
    file_token?: unknown;
    file_type?: unknown;
  };
  header?: {
    app_id?: unknown;
    create_time?: unknown;
    event_id?: unknown;
    event_type?: unknown;
    token?: unknown;
  };
  token?: unknown;
  type?: unknown;
};

export class FeishuWebhookError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'FeishuWebhookError';
  }
}

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const parseJson = (value: string, message: string) => {
  try {
    return JSON.parse(value) as FeishuWebhookPayload;
  } catch {
    throw new FeishuWebhookError(message, 400);
  }
};

const verifySignature = ({
  clock,
  encryptKey,
  headers,
  rawBody,
}: {
  clock: () => number;
  encryptKey: string;
  headers: FeishuWebhookHeaders;
  rawBody: string;
}) => {
  const { nonce, signature, timestamp } = headers;

  if (!nonce || !signature || !timestamp) {
    throw new FeishuWebhookError('Missing Feishu webhook signature', 401);
  }

  const expected = crypto
    .createHash('sha256')
    .update(`${timestamp}${nonce}${encryptKey}${rawBody}`)
    .digest('hex');

  if (!safeEqual(signature, expected)) {
    throw new FeishuWebhookError('Invalid Feishu webhook signature', 401);
  }

  const timestampSeconds = Number(timestamp);

  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(clock() - timestampSeconds * 1000) >
      FEISHU_WEBHOOK_REPLAY_WINDOW_MS
  ) {
    throw new FeishuWebhookError('Stale Feishu webhook signature', 401);
  }
};

const decryptPayload = (encrypt: string, encryptKey: string) => {
  try {
    const encrypted = Buffer.from(encrypt, 'base64');

    if (encrypted.length <= 16) {
      throw new Error('Ciphertext too short');
    }

    const key = crypto.createHash('sha256').update(encryptKey).digest();
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      encrypted.subarray(0, 16),
    );
    return Buffer.concat([
      decipher.update(encrypted.subarray(16)),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new FeishuWebhookError('Invalid encrypted Feishu payload', 400);
  }
};

const requireVerificationToken = (
  payload: FeishuWebhookPayload,
  verificationToken: string,
) => {
  const receivedToken =
    payload.type === 'url_verification' ? payload.token : payload.header?.token;

  if (
    typeof receivedToken !== 'string' ||
    !safeEqual(receivedToken, verificationToken)
  ) {
    throw new FeishuWebhookError('Invalid Feishu verification token', 401);
  }
};

const normalizeOccurredAt = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed > 100_000_000_000_000 ? Math.floor(parsed / 1000) : parsed;
};

export const parseFeishuWebhook = ({
  appId,
  clock = Date.now,
  encryptKey,
  headers = {},
  rawBody,
  verificationToken,
}: ParseFeishuWebhookInput) => {
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_FEISHU_WEBHOOK_BYTES) {
    throw new FeishuWebhookError('Feishu webhook payload is too large', 413);
  }

  const envelope = parseJson(rawBody, 'Invalid Feishu webhook JSON');
  const isPlaintextChallenge = envelope.type === 'url_verification';
  let payload = envelope;

  if (encryptKey && !isPlaintextChallenge) {
    verifySignature({ clock, encryptKey, headers, rawBody });
    const encrypt = (envelope as { encrypt?: unknown }).encrypt;

    if (typeof encrypt !== 'string' || !encrypt) {
      throw new FeishuWebhookError('Missing encrypted Feishu payload', 400);
    }

    payload = parseJson(
      decryptPayload(encrypt, encryptKey),
      'Invalid decrypted Feishu webhook JSON',
    );
  }

  requireVerificationToken(payload, verificationToken);

  if (payload.type === 'url_verification') {
    if (typeof payload.challenge !== 'string' || !payload.challenge) {
      throw new FeishuWebhookError('Missing Feishu challenge', 400);
    }

    return { kind: 'challenge' as const, challenge: payload.challenge };
  }

  if (
    appId &&
    (typeof payload.header?.app_id !== 'string' ||
      !safeEqual(payload.header.app_id, appId))
  ) {
    throw new FeishuWebhookError('Invalid Feishu app id', 401);
  }

  if (
    payload.header?.event_type !== 'drive.file.edit_v1' ||
    payload.event?.file_type !== 'docx'
  ) {
    return { kind: 'ignored' as const };
  }

  if (
    typeof payload.header.event_id !== 'string' ||
    !payload.header.event_id ||
    typeof payload.event.file_token !== 'string' ||
    !payload.event.file_token
  ) {
    throw new FeishuWebhookError('Invalid Feishu file edit event', 400);
  }

  return {
    kind: 'file-edited' as const,
    eventId: payload.header.event_id,
    fileToken: payload.event.file_token,
    occurredAt: normalizeOccurredAt(payload.header.create_time),
  };
};
