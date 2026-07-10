import type { InboundSmsEvent } from './gateway.js';

export interface InboundSmsRecord extends InboundSmsEvent {
  readonly deviceId: string;
}

/**
 * In-memory record of SMS received by gateway devices and forwarded over the
 * WebSocket. This is intentionally not a persistence layer - there is no
 * inbound-message concept in @acp/messaging yet (only outbound `send`). This
 * class exists so inbound SMS is at least observable (recent(), for a future
 * endpoint/webhook to consume) instead of silently discarded, while real
 * persistence/webhook-fanout is designed as its own follow-up feature.
 */
export class InboundSmsLog {
  private readonly records: InboundSmsRecord[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  record(deviceId: string, message: InboundSmsEvent): void {
    this.records.push({ deviceId, ...message });
    if (this.records.length > this.maxSize) {
      this.records.shift();
    }
  }

  recent(limit = 50): readonly InboundSmsRecord[] {
    return this.records.slice(-limit);
  }
}
