import type { Database } from '@acp/database';
import type { WebhookRepository } from './repositories.js';
import type { WebhookEventName, WebhookSubscription } from './types.js';

interface WebhookRow {
  readonly id: string;
  readonly organization_id: string;
  readonly url: string;
  readonly events: readonly WebhookEventName[];
  readonly secret: string;
  readonly created_at: string;
}

function toSubscription(row: WebhookRow): WebhookSubscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    url: row.url,
    events: row.events,
    secret: row.secret,
    createdAt: row.created_at,
  };
}

export class PostgresWebhookRepository implements WebhookRepository {
  constructor(private readonly db: Database) {}

  async create(subscription: WebhookSubscription): Promise<WebhookSubscription> {
    await this.db.query(
      `INSERT INTO webhook_subscriptions (id, organization_id, url, events, secret, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        subscription.id,
        subscription.organizationId,
        subscription.url,
        subscription.events,
        subscription.secret,
        subscription.createdAt,
      ],
    );
    return subscription;
  }

  async listByOrganization(organizationId: string): Promise<WebhookSubscription[]> {
    const result = await this.db.query<WebhookRow>(
      'SELECT * FROM webhook_subscriptions WHERE organization_id = $1',
      [organizationId],
    );
    return result.rows.map(toSubscription);
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM webhook_subscriptions WHERE id = $1', [id]);
  }
}
