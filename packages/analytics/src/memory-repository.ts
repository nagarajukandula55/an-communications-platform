import type { Message } from '@acp/types';
import { computeDeliveryStats } from './compute-stats.js';
import type { AnalyticsRepository, DateRange, DeliveryStats } from './types.js';

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly messages: readonly Message[]) {}

  getDeliveryStats(tenantId: string, range?: DateRange): Promise<DeliveryStats> {
    const scoped = this.messages.filter((message) => message.tenantId === tenantId);
    return Promise.resolve(computeDeliveryStats(scoped, range));
  }
}
