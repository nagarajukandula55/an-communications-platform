import type { EncryptedPayload } from './crypto.js';
import type { IntegrationProvider } from './types.js';

export interface StoredIntegration {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: IntegrationProvider;
  readonly payload: EncryptedPayload;
  readonly updatedAt: string;
}

export interface IntegrationRepository {
  upsert(record: StoredIntegration): Promise<void>;
  get(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<StoredIntegration | undefined>;
}
