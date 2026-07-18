import { describe, expect, it, vi } from 'vitest';
import { AnuReportClient } from './client.js';
import { AnuReportingDeadLetterQueue, type DeadLetterQueueLike } from './dead-letter-reporter.js';

describe('AnuReportingDeadLetterQueue', () => {
  it('delegates to the wrapped queue and reports the failure to ANu', async () => {
    const pushed: Array<{ payload: unknown; reason: string }> = [];
    const inner: DeadLetterQueueLike<{ id: string }> = {
      push: async (payload, reason) => {
        pushed.push({ payload, reason });
      },
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, id: 'issue-1' }), { status: 201 }),
    );
    const anu = new AnuReportClient({ baseUrl: 'https://angroup.in', serviceKey: 'secret', fetchImpl });
    const queue = new AnuReportingDeadLetterQueue(inner, anu, { source: 'acp-test' });

    await queue.push({ id: 'msg-1' }, 'all transports exhausted');

    expect(pushed).toEqual([{ payload: { id: 'msg-1' }, reason: 'all transports exhausted' }]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://angroup.in/api/anu/issues',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('still completes the push even if reporting to ANu fails', async () => {
    const pushed: unknown[] = [];
    const inner: DeadLetterQueueLike<string> = {
      push: async (payload) => {
        pushed.push(payload);
      },
    };
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const anu = new AnuReportClient({ baseUrl: 'https://angroup.in', serviceKey: 'secret', fetchImpl });
    const queue = new AnuReportingDeadLetterQueue(inner, anu);

    await expect(queue.push('payload', 'timeout')).resolves.toBeUndefined();
    expect(pushed).toEqual(['payload']);
  });
});
