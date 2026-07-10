import type { IntegrationRepository, StoredIntegration } from './repositories.js';
import type { IntegrationProvider } from './types.js';

export class InMemoryIntegrationRepository implements IntegrationRepository {
  private readonly records = new Map<string, StoredIntegration>();

  private key(organizationId: string, provider: IntegrationProvider): string {
    return `${organizationId}:${provider}`;
  }

  upsert(record: StoredIntegration): Promise<void> {
    this.records.set(this.key(record.organizationId, record.provider), record);
    return Promise.resolve();
  }

  get(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<StoredIntegration | undefined> {
    return Promise.resolve(this.records.get(this.key(organizationId, provider)));
  }
}
