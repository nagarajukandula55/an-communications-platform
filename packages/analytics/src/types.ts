import type { Channel, MessageStatus } from '@acp/types';

export interface DeliveryStats {
  readonly total: number;
  readonly byStatus: Partial<Record<MessageStatus, number>>;
  readonly byChannel: Partial<Record<Channel, number>>;
}

export interface DateRange {
  readonly from?: Date;
  readonly to?: Date;
}

export interface AnalyticsRepository {
  getDeliveryStats(tenantId: string, range?: DateRange): Promise<DeliveryStats>;
}
