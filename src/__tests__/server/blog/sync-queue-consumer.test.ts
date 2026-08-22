/** @jest-environment node */

import {
  createFeishuSyncQueueConsumer,
  createFeishuSyncQueueRetryHandler,
  getFeishuSyncQueueRetryDirective,
} from '@/server/blog/sync-queue-consumer';

describe('createFeishuSyncQueueConsumer', () => {
  it('processes a valid delayed sync wakeup', async () => {
    const processWakeup = jest.fn().mockResolvedValue({ status: 'synced' });
    const consume = createFeishuSyncQueueConsumer(processWakeup);

    await expect(
      consume({ eventId: 'event-1', generation: 2 }),
    ).resolves.toBeUndefined();

    expect(processWakeup).toHaveBeenCalledWith({
      eventId: 'event-1',
      generation: 2,
    });
  });

  it.each([
    null,
    {},
    { eventId: '', generation: 1 },
    { eventId: 'event-1', generation: 0 },
    { eventId: 'event-1', generation: 1.5 },
    { eventId: 'event-1', generation: '1' },
  ])(
    'acknowledges an invalid payload without running sync: %p',
    async (input) => {
      const processWakeup = jest.fn();
      const consume = createFeishuSyncQueueConsumer(processWakeup);

      await expect(consume(input)).resolves.toBeUndefined();

      expect(processWakeup).not.toHaveBeenCalled();
    },
  );

  it('backs off transient failures and acknowledges a poison message', () => {
    expect(getFeishuSyncQueueRetryDirective({ deliveryCount: 1 })).toEqual({
      afterSeconds: 60,
    });
    expect(getFeishuSyncQueueRetryDirective({ deliveryCount: 4 })).toEqual({
      afterSeconds: 480,
    });
    expect(getFeishuSyncQueueRetryDirective({ deliveryCount: 9 })).toEqual({
      afterSeconds: 3600,
    });
    expect(getFeishuSyncQueueRetryDirective({ deliveryCount: 10 })).toEqual({
      acknowledge: true,
    });
  });

  it('logs retry exhaustion without exposing provider error details', () => {
    const log = jest.fn();
    const retry = createFeishuSyncQueueRetryHandler(log);

    expect(
      retry(new Error('secret provider response'), { deliveryCount: 10 }),
    ).toEqual({ acknowledge: true });
    expect(log).toHaveBeenCalledWith('Feishu sync queue retries exhausted', {
      deliveryCount: 10,
      errorType: 'Error',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      'secret provider response',
    );
  });
});
