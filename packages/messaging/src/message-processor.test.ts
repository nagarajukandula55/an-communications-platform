import { describe, expect, it } from 'vitest';
import { EventBus } from '@acp/events';
import type { DeliveryReport, Message } from '@acp/types';
import { InMemoryDeadLetterQueue } from './dead-letter-queue.js';
import { InMemoryMessageRepository } from './memory-repository.js';
import { createMessageProcessor } from './message-processor.js';
import type { QueuedMessagePayload } from './message-service.js';
import { InMemoryMessageQueue } from './queue.js';
import { RetryPolicy } from './retry-policy.js';
import { MessageRouter } from './router.js';

async function seedMessage(repository: InMemoryMessageRepository) {
  const message: Message = {
    id: 'msg-1',
    tenantId: 't1',
    channel: 'sms',
    to: '+10000000000',
    body: 'hello',
    status: 'queued',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
  await repository.create(message);
  return message;
}

function createDeps(retryPolicy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10 })) {
  const repository = new InMemoryMessageRepository();
  const router = new MessageRouter();
  const queue = new InMemoryMessageQueue<QueuedMessagePayload>();
  const deadLetter = new InMemoryDeadLetterQueue<QueuedMessagePayload>();
  const events = new EventBus();
  return { repository, router, queue, deadLetter, events, retryPolicy };
}

describe('createMessageProcessor', () => {
  it('marks the message sent and emits MessageSent on success', async () => {
    const deps = createDeps();
    await seedMessage(deps.repository);
    deps.router.register({ channel: 'sms', send: () => Promise.resolve({}) });

    const sent: Message[] = [];
    deps.events.on('MessageSent', (message: Message) => {
      sent.push(message);
    });

    const process = createMessageProcessor(deps);
    await process({ messageId: 'msg-1' });

    const stored = await deps.repository.findById('msg-1');
    expect(stored?.status).toBe('sent');
    expect(sent).toHaveLength(1);
  });

  it('re-enqueues with backoff when the transport fails and attempts remain', async () => {
    const deps = createDeps();
    await seedMessage(deps.repository);
    deps.router.register({
      channel: 'sms',
      send: () => Promise.reject(new Error('provider down')),
    });

    const process = createMessageProcessor(deps);
    await process({ messageId: 'msg-1', attempt: 1 });

    expect(deps.queue.jobs).toHaveLength(1);
    expect(deps.queue.jobs[0]?.payload).toEqual({
      messageId: 'msg-1',
      attempt: 2,
    });

    const stored = await deps.repository.findById('msg-1');
    expect(stored?.status).toBe('queued');
  });

  it('dead-letters and marks failed once attempts are exhausted', async () => {
    const deps = createDeps(new RetryPolicy({ maxAttempts: 2, baseDelayMs: 10 }));
    await seedMessage(deps.repository);
    deps.router.register({
      channel: 'sms',
      send: () => Promise.reject(new Error('provider down')),
    });

    const failed: DeliveryReport[] = [];
    deps.events.on('MessageFailed', (report: DeliveryReport) => {
      failed.push(report);
    });

    const process = createMessageProcessor(deps);
    await process({ messageId: 'msg-1', attempt: 2 });

    expect(deps.queue.jobs).toHaveLength(0);
    expect(deps.deadLetter.entries).toHaveLength(1);
    expect(deps.deadLetter.entries[0]?.reason).toBe('provider down');

    const stored = await deps.repository.findById('msg-1');
    expect(stored?.status).toBe('failed');
    expect(failed).toHaveLength(1);
  });

  it('is a no-op when the message no longer exists', async () => {
    const deps = createDeps();
    const process = createMessageProcessor(deps);

    await expect(process({ messageId: 'missing' })).resolves.toBeUndefined();
    expect(deps.queue.jobs).toHaveLength(0);
  });
});
