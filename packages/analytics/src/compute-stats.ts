import type { Message } from '@acp/types';
import type { DateRange, DeliveryStats } from './types.js';

export function computeDeliveryStats(
  messages: readonly Message[],
  range: DateRange = {},
): DeliveryStats {
  const byStatus: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  let total = 0;

  for (const message of messages) {
    const createdAt = new Date(message.createdAt);
    if (range.from && createdAt < range.from) {
      continue;
    }
    if (range.to && createdAt > range.to) {
      continue;
    }

    total += 1;
    byStatus[message.status] = (byStatus[message.status] ?? 0) + 1;
    byChannel[message.channel] = (byChannel[message.channel] ?? 0) + 1;
  }

  return { total, byStatus, byChannel };
}
