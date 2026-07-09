import type { Database } from '@acp/database';
import type { Channel, Message, MessageStatus } from '@acp/types';
import type { MessageRepository } from './repositories.js';

interface MessageRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly channel: Channel;
  readonly to: string;
  readonly from: string | null;
  readonly body: string;
  readonly status: MessageStatus;
  readonly template_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channel: row.channel,
    to: row.to,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.from !== null ? { from: row.from } : {}),
    ...(row.template_id !== null ? { templateId: row.template_id } : {}),
    ...(row.metadata !== null ? { metadata: row.metadata } : {}),
  };
}

export class PostgresMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async create(message: Message): Promise<Message> {
    await this.db.query(
      `INSERT INTO messages
         (id, tenant_id, channel, "to", "from", body, status, template_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        message.id,
        message.tenantId,
        message.channel,
        message.to,
        message.from ?? null,
        message.body,
        message.status,
        message.templateId ?? null,
        message.metadata ? JSON.stringify(message.metadata) : null,
        message.createdAt,
        message.updatedAt,
      ],
    );
    return message;
  }

  async findById(id: string): Promise<Message | undefined> {
    const result = await this.db.query<MessageRow>(
      'SELECT * FROM messages WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toMessage(result.rows[0]) : undefined;
  }

  async updateStatus(id: string, status: MessageStatus): Promise<void> {
    await this.db.query(
      'UPDATE messages SET status = $2, updated_at = now() WHERE id = $1',
      [id, status],
    );
  }
}
