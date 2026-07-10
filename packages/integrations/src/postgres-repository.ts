import type { Database } from '@acp/database';
import type { IntegrationRepository, StoredIntegration } from './repositories.js';
import type { IntegrationProvider } from './types.js';

interface IntegrationRow {
  readonly id: string;
  readonly organization_id: string;
  readonly provider: IntegrationProvider;
  readonly iv: string;
  readonly auth_tag: string;
  readonly ciphertext: string;
  readonly updated_at: string;
}

function toStored(row: IntegrationRow): StoredIntegration {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    payload: { iv: row.iv, authTag: row.auth_tag, ciphertext: row.ciphertext },
    updatedAt: row.updated_at,
  };
}

export class PostgresIntegrationRepository implements IntegrationRepository {
  constructor(private readonly db: Database) {}

  async upsert(record: StoredIntegration): Promise<void> {
    await this.db.query(
      `INSERT INTO integrations (id, organization_id, provider, iv, auth_tag, ciphertext, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, provider)
       DO UPDATE SET iv = $4, auth_tag = $5, ciphertext = $6, updated_at = $7`,
      [
        record.id,
        record.organizationId,
        record.provider,
        record.payload.iv,
        record.payload.authTag,
        record.payload.ciphertext,
        record.updatedAt,
      ],
    );
  }

  async get(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<StoredIntegration | undefined> {
    const result = await this.db.query<IntegrationRow>(
      'SELECT * FROM integrations WHERE organization_id = $1 AND provider = $2',
      [organizationId, provider],
    );
    return result.rows[0] ? toStored(result.rows[0]) : undefined;
  }
}
