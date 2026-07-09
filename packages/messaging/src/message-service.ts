import { generateId } from '@acp/shared';
import type { EventBus } from '@acp/events';
import type { Channel, Message } from '@acp/types';
import type { MessageQueue } from './queue.js';
import type { MessageRepository } from './repositories.js';
import { renderTemplate, type Template } from './template.js';

export interface QueuedMessagePayload {
  readonly messageId: string;
}

export interface SendMessageInput {
  readonly tenantId: string;
  readonly channel: Channel;
  readonly to: string;
  readonly from?: string;
  readonly scheduledAt?: Date;
  readonly template?: Template;
  readonly templateVariables?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export class InvalidMessageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMessageInputError';
  }
}

export interface MessageServiceDeps {
  readonly repository: MessageRepository;
  readonly queue: MessageQueue<QueuedMessagePayload>;
  readonly events: EventBus;
}

const QUEUE_JOB_NAME = 'send-message';

export class MessageService {
  constructor(private readonly deps: MessageServiceDeps) {}

  async send(input: SendMessageInput): Promise<Message> {
    const body = input.template
      ? renderTemplate(input.template, input.templateVariables ?? {})
      : input.body;

    if (!body) {
      throw new InvalidMessageInputError(
        'Either body or template must be provided',
      );
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: generateId(),
      tenantId: input.tenantId,
      channel: input.channel,
      to: input.to,
      body,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ...(input.from !== undefined ? { from: input.from } : {}),
      ...(input.template ? { templateId: input.template.id } : {}),
    };

    await this.deps.repository.create(message);
    this.deps.events.emit('MessageCreated', message);

    const delayMs = input.scheduledAt
      ? Math.max(0, input.scheduledAt.getTime() - Date.now())
      : undefined;

    await this.deps.queue.enqueue(
      QUEUE_JOB_NAME,
      { messageId: message.id },
      delayMs !== undefined ? { delayMs } : {},
    );

    await this.deps.repository.updateStatus(message.id, 'queued');
    const queued: Message = { ...message, status: 'queued' };
    this.deps.events.emit('MessageQueued', queued);

    return queued;
  }
}
