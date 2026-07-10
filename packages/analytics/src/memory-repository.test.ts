import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import { InMemoryAnalyticsRepository } from './memory-repository.js';

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: overrides.id ?? 'm1',
    tenantId: overrides.tenantId ?? 't1',
    channel: 'sms',
    to: '+10000000000',
    body: 'hello',
    status: 'sent',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe('InMemoryAnalyticsRepository', () => {
  it('scopes stats to the requested tenant', async () => {
    const repo = new InMemoryAnalyticsRepository([
      message({ id: '1', tenantId: 't1' }),
      message({ id: '2', tenantId: 't2' }),
    ]);

    const stats = await repo.getDeliveryStats('t1');
    expect(stats.total).toBe(1);
  });
});
