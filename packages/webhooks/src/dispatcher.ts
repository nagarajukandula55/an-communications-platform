import { retry } from '@acp/shared';
import type { EventBus } from '@acp/events';
import type { WebhookRepository } from './repositories.js';
import { signPayload } from './signing.js';
import { WEBHOOK_EVENT_NAMES, type WebhookEventName } from './types.js';

export interface WebhookDispatcherOptions {
  readonly repository: WebhookRepository;
  readonly events: EventBus;
  readonly fetchFn?: typeof fetch;
  readonly retryAttempts?: number;
  readonly retryBaseDelayMs?: number;
}

interface TenantScoped {
  readonly tenantId: string;
}

export class WebhookDispatcher {
  private readonly fetchFn: typeof fetch;
  private readonly retryAttempts: number;
  private readonly retryBaseDelayMs: number;

  constructor(private readonly options: WebhookDispatcherOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 1000;

    for (const eventName of WEBHOOK_EVENT_NAMES) {
      this.options.events.on(eventName, (payload) => {
        void this.handleEvent(eventName, payload);
      });
    }
  }

  private async handleEvent(
    eventName: WebhookEventName,
    payload: TenantScoped,
  ): Promise<void> {
    const subscriptions = await this.options.repository.listByOrganization(
      payload.tenantId,
    );
    const matching = subscriptions.filter((sub) => sub.events.includes(eventName));

    await Promise.all(
      matching.map((subscription) => this.deliver(subscription.url, subscription.secret, eventName, payload)),
    );
  }

  private async deliver(
    url: string,
    secret: string,
    eventName: WebhookEventName,
    payload: unknown,
  ): Promise<void> {
    const body = JSON.stringify({ event: eventName, payload, sentAt: new Date().toISOString() });
    const signature = signPayload(secret, body);

    try {
      await retry(
        async () => {
          const response = await this.fetchFn(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-acp-signature': signature,
            },
            body,
          });
          if (!response.ok) {
            throw new Error(`Webhook delivery failed with status ${String(response.status)}`);
          }
        },
        { attempts: this.retryAttempts, baseDelayMs: this.retryBaseDelayMs },
      );
    } catch {
      // Delivery exhausted its retries. A production build would record
      // this to a dead-letter table for operator visibility; logging
      // that wiring is out of scope here (no logger threaded through).
    }
  }
}
