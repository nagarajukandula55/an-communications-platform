import { describe, expect, it } from 'vitest';
import { InMemoryIntegrationRepository } from './memory-repository.js';
import { IntegrationsService } from './integrations-service.js';

function createService() {
  return new IntegrationsService(new InMemoryIntegrationRepository(), {
    encryptionSecret: 'test-secret',
  });
}

describe('IntegrationsService', () => {
  it('returns undefined when nothing has been saved', async () => {
    const service = createService();
    await expect(service.getConfig('org-1', 'smtp')).resolves.toBeUndefined();
  });

  it('saves and retrieves the full plaintext config', async () => {
    const service = createService();
    await service.save('org-1', 'smtp', {
      host: 'smtp.example.com',
      port: '587',
      username: 'acp',
      password: 'super-secret',
      fromAddress: 'no-reply@example.com',
    });

    const config = await service.getConfig('org-1', 'smtp');
    expect(config?.password).toBe('super-secret');
  });

  it('masks secret fields in the masked view but not plain fields', async () => {
    const service = createService();
    await service.save('org-1', 'smtp', {
      host: 'smtp.example.com',
      port: '587',
      username: 'acp',
      password: 'super-secret',
      fromAddress: 'no-reply@example.com',
    });

    const masked = await service.getMaskedConfig('org-1', 'smtp');
    expect(masked?.host).toBe('smtp.example.com');
    expect(masked?.password).not.toBe('super-secret');
    expect(masked?.password).toMatch(/•+/);
  });

  it('scopes config by organization and provider', async () => {
    const service = createService();
    await service.save('org-1', 'smtp', { host: 'a' });
    await service.save('org-1', 'whatsapp', { accessToken: 'token-a' });
    await service.save('org-2', 'smtp', { host: 'b' });

    expect((await service.getConfig('org-1', 'smtp'))?.host).toBe('a');
    expect((await service.getConfig('org-1', 'whatsapp'))?.accessToken).toBe(
      'token-a',
    );
    expect((await service.getConfig('org-2', 'smtp'))?.host).toBe('b');
  });
});
