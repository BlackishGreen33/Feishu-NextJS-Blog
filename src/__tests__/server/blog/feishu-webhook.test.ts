/** @jest-environment node */

import crypto from 'crypto';

import {
  FeishuWebhookError,
  parseFeishuWebhook,
} from '@/server/blog/feishu-webhook';

const verificationToken = 'verification-token-for-tests';
const encryptKey = 'encrypt-key-for-tests';

const encryptPayload = (payload: unknown) => {
  const key = crypto.createHash('sha256').update(encryptKey).digest();
  const iv = Buffer.from('0123456789abcdef');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([
    iv,
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]).toString('base64');
};

const signPayload = (rawBody: string, timestamp: string, nonce: string) =>
  crypto
    .createHash('sha256')
    .update(`${timestamp}${nonce}${encryptKey}${rawBody}`)
    .digest('hex');

describe('parseFeishuWebhook', () => {
  it('accepts a plaintext URL verification challenge with the configured token', () => {
    expect(
      parseFeishuWebhook({
        rawBody: JSON.stringify({
          challenge: 'challenge-value',
          token: verificationToken,
          type: 'url_verification',
        }),
        verificationToken,
      }),
    ).toEqual({ kind: 'challenge', challenge: 'challenge-value' });
  });

  it('allows only the plaintext challenge when event encryption is enabled', () => {
    expect(
      parseFeishuWebhook({
        encryptKey,
        rawBody: JSON.stringify({
          challenge: 'challenge-value',
          token: verificationToken,
          type: 'url_verification',
        }),
        verificationToken,
      }),
    ).toEqual({ kind: 'challenge', challenge: 'challenge-value' });

    expect(() =>
      parseFeishuWebhook({
        encryptKey,
        rawBody: JSON.stringify({
          header: { token: verificationToken },
          event: {},
        }),
        verificationToken,
      }),
    ).toThrow('Missing Feishu webhook signature');
  });

  it('rejects a plaintext request with the wrong verification token', () => {
    expect(() =>
      parseFeishuWebhook({
        rawBody: JSON.stringify({
          challenge: 'challenge-value',
          token: 'wrong-token',
          type: 'url_verification',
        }),
        verificationToken,
      }),
    ).toThrow(FeishuWebhookError);
  });

  it('verifies, decrypts, and parses an encrypted docx edit event', () => {
    const timestamp = '1724313600';
    const nonce = 'nonce-value';
    const encrypted = encryptPayload({
      schema: '2.0',
      header: {
        app_id: 'cli_test',
        create_time: '1724313600000',
        event_id: 'event-1',
        event_type: 'drive.file.edit_v1',
        token: verificationToken,
      },
      event: { file_token: 'docx-token', file_type: 'docx' },
    });
    const rawBody = JSON.stringify({ encrypt: encrypted });

    expect(
      parseFeishuWebhook({
        appId: 'cli_test',
        encryptKey,
        headers: {
          nonce,
          signature: signPayload(rawBody, timestamp, nonce),
          timestamp,
        },
        rawBody,
        verificationToken,
        clock: () => Number(timestamp) * 1000,
      }),
    ).toEqual({
      kind: 'file-edited',
      eventId: 'event-1',
      fileToken: 'docx-token',
      occurredAt: 1_724_313_600_000,
    });
  });

  it('rejects an encrypted request with an invalid signature before decryption', () => {
    const rawBody = JSON.stringify({ encrypt: encryptPayload({ ok: true }) });

    expect(() =>
      parseFeishuWebhook({
        encryptKey,
        headers: {
          nonce: 'nonce-value',
          signature: 'invalid',
          timestamp: '1724313600',
        },
        rawBody,
        verificationToken,
      }),
    ).toThrow('Invalid Feishu webhook signature');
  });

  it('rejects a correctly signed request outside the replay window', () => {
    const timestamp = '1724313600';
    const nonce = 'nonce-value';
    const rawBody = JSON.stringify({ encrypt: encryptPayload({ ok: true }) });

    expect(() =>
      parseFeishuWebhook({
        clock: () => Number(timestamp) * 1000 + 600_001,
        encryptKey,
        headers: {
          nonce,
          signature: signPayload(rawBody, timestamp, nonce),
          timestamp,
        },
        rawBody,
        verificationToken,
      }),
    ).toThrow('Stale Feishu webhook signature');
  });

  it('ignores authenticated events outside docx edits', () => {
    expect(
      parseFeishuWebhook({
        rawBody: JSON.stringify({
          schema: '2.0',
          header: {
            app_id: 'cli_test',
            event_id: 'event-2',
            event_type: 'drive.file.edit_v1',
            token: verificationToken,
          },
          event: { file_token: 'sheet-token', file_type: 'sheet' },
        }),
        appId: 'cli_test',
        verificationToken,
      }),
    ).toEqual({ kind: 'ignored' });
  });

  it('rejects malformed and oversized payloads', () => {
    expect(() =>
      parseFeishuWebhook({ rawBody: '{', verificationToken }),
    ).toThrow('Invalid Feishu webhook JSON');
    expect(() =>
      parseFeishuWebhook({
        rawBody: 'x'.repeat(256 * 1024 + 1),
        verificationToken,
      }),
    ).toThrow('Feishu webhook payload is too large');
  });
});
