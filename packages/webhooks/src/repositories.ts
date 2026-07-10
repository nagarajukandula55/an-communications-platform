import type { WebhookSubscription } from './types.js';

export interface WebhookRepository {
  create(subscription: WebhookSubscription): Promise<WebhookSubscription>;
  listByOrganization(organizationId: string): Promise<WebhookSubscription[]>;
  delete(id: string): Promise<void>;
}
