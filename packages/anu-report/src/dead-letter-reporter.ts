import { AnuReportClient } from './client.js';

// Structurally compatible with @acp/messaging's DeadLetterQueue<T> - not
// imported directly, to avoid adding a workspace dependency edge just for
// a two-method interface both packages can agree on independently.
export interface DeadLetterQueueLike<T> {
  push(payload: T, reason: string): Promise<void>;
}

/**
 * Wraps any DeadLetterQueue so every permanently-failed message also gets
 * reported to ANu (see client.ts) - this is the concrete "ANu looks after
 * ACP" hook: a message that exhausted every retry and every transport is
 * exactly the kind of thing that needs a human, and ACP's real dead-letter
 * queue is already the single place that knows about every one of them.
 *
 * Delegates to the wrapped queue first, always - reporting to ANu is
 * best-effort and must never block or fail the actual dead-lettering.
 */
export class AnuReportingDeadLetterQueue<T> implements DeadLetterQueueLike<T> {
  constructor(
    private readonly inner: DeadLetterQueueLike<T>,
    private readonly anu: AnuReportClient,
    private readonly options: { source: string; businessId?: string } = { source: 'acp-dead-letter-queue' },
  ) {}

  async push(payload: T, reason: string): Promise<void> {
    await this.inner.push(payload, reason);

    // Best-effort, fire-and-forget: never let an ANu reporting failure
    // affect message processing, which has already completed by this point.
    this.anu
      .report({
        title: 'Message permanently failed delivery',
        description: `Reason: ${reason}\n\nPayload: ${safeStringify(payload)}`,
        severity: 'HIGH',
        source: this.options.source,
        ...(this.options.businessId ? { businessId: this.options.businessId } : {}),
      })
      .catch(() => {});
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
