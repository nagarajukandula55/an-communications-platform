import { generateId } from '@acp/shared';
import { decryptConfig, encryptConfig } from './crypto.js';
import type { IntegrationRepository } from './repositories.js';
import {
  INTEGRATION_FIELD_SPECS,
  type IntegrationConfig,
  type IntegrationProvider,
} from './types.js';

const MASK = '••••••••';

export interface IntegrationsServiceOptions {
  readonly encryptionSecret: string;
}

export class IntegrationsService {
  constructor(
    private readonly repository: IntegrationRepository,
    private readonly options: IntegrationsServiceOptions,
  ) {}

  async save(
    organizationId: string,
    provider: IntegrationProvider,
    config: IntegrationConfig,
  ): Promise<void> {
    const payload = encryptConfig(config, this.options.encryptionSecret);
    await this.repository.upsert({
      id: generateId(),
      organizationId,
      provider,
      payload,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Full plaintext config, for transports to actually use at send time. */
  async getConfig(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationConfig | undefined> {
    const stored = await this.repository.get(organizationId, provider);
    if (!stored) {
      return undefined;
    }
    return decryptConfig(stored.payload, this.options.encryptionSecret);
  }

  /** Masked view safe to return from an API for a settings UI. */
  async getMaskedConfig(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationConfig | undefined> {
    const config = await this.getConfig(organizationId, provider);
    if (!config) {
      return undefined;
    }

    const specs = INTEGRATION_FIELD_SPECS[provider];
    const masked: Record<string, string> = {};
    for (const spec of specs) {
      const value = config[spec.key];
      if (value === undefined) {
        continue;
      }
      masked[spec.key] = spec.secret ? MASK : value;
    }
    return masked;
  }
}
