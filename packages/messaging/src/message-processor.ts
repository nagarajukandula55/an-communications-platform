import type { EventBus } from '@acp/events';
import type { DeliveryReport } from '@acp/types';
import type { DeadLetterQueue } from './dead-letter-queue.js';
import { SEND_MESSAGE_JOB, type QueuedMessagePayload } from './message-service.js';
import type { MessageQueue } from './queue.js';
import type { MessageRepository } from './repositories.js';
import type { RetryPolicy } from './retry-policy.js';
import type { MessageRouter } from './router.js';

export interface MessageProcessorDeps {
  readonly repository: MessageRepository;
  readonly router: MessageRouter;
  readonly queue: MessageQueue<QueuedMessagePayload>;
  readonly deadLetter: DeadLetterQueue<QueuedMessagePayload>;
  readonly events: EventBus;
  readonly retryPolicy: RetryPolicy;
}

export function createMessageProcessor(
  deps: MessageProcessorDeps,
): (payload: QueuedMessagePayload) => Promise<void> {
  return async (payload: QueuedMessagePayload): Promise<void> => {
    const attempt = payload.attempt ?? 1;
    const message = await deps.repository.findById(payload.messageId);
    if (!message) {
      return;
    }

    try {
      await deps.router.route(message);
      await deps.repository.updateStatus(message.id, 'sent');
      deps.events.emit('MessageSent', { ...message, status: 'sent' });
    } catch (error) {
      const decision = deps.retryPolicy.decide(attempt);
      const reason = error instanceof Error ? error.message : String(error);

      if (decision.shouldRetry) {
        await deps.queue.enqueue(
          SEND_MESSAGE_JOB,
          { messageId: message.id, attempt: attempt + 1 },
          { delayMs: decision.delayMs },
        );
        return;
      }

      await deps.repository.updateStatus(message.id, 'failed');
      await deps.deadLetter.push(payload, reason);

      const report: DeliveryReport = {
        messageId: message.id,
        status: 'failed',
        errorMessage: reason,
        occurredAt: new Date().toISOString(),
      };
      deps.events.emit('MessageFailed', report);
    }
  };
}
