import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import { computeDeliveryStats } from './compute-stats.js';

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: overrides.id ?? 'm1',
    tenantId: 't1',
    channel: 'sms',
    to: '+10000000000',
    body: 'hello',
    status: 'sent',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

describe('computeDeliveryStats', () => {
  it('counts totals, by status, and by channel', () => {
    const messages = [
      message({ id: '1', status: 'sent', channel: 'sms' }),
      message({ id: '2', status: 'sent', channel: 'sms' }),
      message({ id: '3', status: 'failed', channel: 'email' }),
    ];

    const stats = computeDeliveryStats(messages);

    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({ sent: 2, failed: 1 });
    expect(stats.byChannel).toEqual({ sms: 2, email: 1 });
  });

  it('returns zeroed stats for an empty list', () => {
    expect(computeDeliveryStats([])).toEqual({
      total: 0,
      byStatus: {},
      byChannel: {},
    });
  });

  it('filters by date range', () => {
    const messages = [
      message({ id: '1', createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString() }),
      message({ id: '2', createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString() }),
      message({ id: '3', createdAt: new Date('2026-03-01T00:00:00.000Z').toISOString() }),
    ];

    const stats = computeDeliveryStats(messages, {
      from: new Date('2026-01-15T00:00:00.000Z'),
      to: new Date('2026-02-15T00:00:00.000Z'),
    });

    expect(stats.total).toBe(1);
  });
});
