import { describe, expect, it } from 'vitest';
import { EventBus } from '@acp/events';
import type { Message } from '@acp/types';
import { InMemoryMessageQueue } from './queue.js';
import { InMemoryMessageRepository } from './memory-repository.js';
import {
  InvalidMessageInputError,
  MessageService,
  type QueuedMessagePayload,
} from './message-service.js';

function createService() {
  const repository = new InMemoryMessageRepository();
  const queue = new InMemoryMessageQueue<QueuedMessagePayload>();
  const events = new EventBus();
  const service = new MessageService({ repository, queue, events });
  return { service, repository, queue, events };
}

describe('MessageService', () => {
  it('sends a message with a plain body and queues it', async () => {
    const { service, queue } = createService();

    const message = await service.send({
      tenantId: 't1',
      channel: 'sms',
      to: '+10000000000',
      body: 'hello world',
    });

    expect(message.status).toBe('queued');
    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0]?.payload.messageId).toBe(message.id);
  });

  it('renders a template into the message body', async () => {
    const { service } = createService();

    const message = await service.send({
      tenantId: 't1',
      channel: 'sms',
      to: '+10000000000',
      template: { id: 'tpl-1', name: 'greeting', body: 'Hi {{name}}!' },
      templateVariables: { name: 'Ann' },
    });

    expect(message.body).toBe('Hi Ann!');
    expect(message.templateId).toBe('tpl-1');
  });

  it('throws when neither body nor template is provided', async () => {
    const { service } = createService();

    await expect(
      service.send({ tenantId: 't1', channel: 'sms', to: '+10000000000' }),
    ).rejects.toBeInstanceOf(InvalidMessageInputError);
  });

  it('emits MessageCreated then MessageQueued', async () => {
    const { service, events } = createService();
    const seen: string[] = [];

    events.on('MessageCreated', (message: Message) => {
      seen.push(`created:${message.status}`);
    });
    events.on('MessageQueued', (message: Message) => {
      seen.push(`queued:${message.status}`);
    });

    await service.send({
      tenantId: 't1',
      channel: 'sms',
      to: '+10000000000',
      body: 'hello',
    });

    expect(seen).toEqual(['created:pending', 'queued:queued']);
  });

  it('persists the message and updates its status', async () => {
    const { service, repository } = createService();

    const message = await service.send({
      tenantId: 't1',
      channel: 'sms',
      to: '+10000000000',
      body: 'hello',
    });

    const stored = await repository.findById(message.id);
    expect(stored?.status).toBe('queued');
  });
});
