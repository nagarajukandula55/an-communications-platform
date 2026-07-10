import type { WebhookRepository } from './repositories.js';
import type { WebhookSubscription } from './types.js';

export class InMemoryWebhookRepository implements WebhookRepository {
  private readonly subscriptions = new Map<string, WebhookSubscription>();

  create(subscription: WebhookSubscription): Promise<WebhookSubscription> {
    this.subscriptions.set(subscription.id, subscription);
    return Promise.resolve(subscription);
  }

  listByOrganization(organizationId: string): Promise<WebhookSubscription[]> {
    return Promise.resolve(
      [...this.subscriptions.values()].filter(
        (sub) => sub.organizationId === organizationId,
      ),
    );
  }

  delete(id: string): Promise<void> {
    this.subscriptions.delete(id);
    return Promise.resolve();
  }
}
