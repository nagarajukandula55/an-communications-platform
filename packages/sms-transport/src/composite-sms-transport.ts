import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';

export interface CompositeSmsTransportOptions {
  /** Tried in order; the first transport that succeeds wins. */
  readonly transports: readonly Transport[];
}

export class AllTransportsFailedError extends Error {
  constructor(readonly causes: readonly unknown[]) {
    super(`All ${String(causes.length)} SMS transport(s) failed`);
    this.name = 'AllTransportsFailedError';
  }
}

/**
 * Implements failover + priority routing across multiple SMS-capable
 * transports (e.g. Android gateway devices first, GSM modem as
 * last-resort fallback). Registered as the single 'sms' handler on
 * MessageRouter.
 */
export class CompositeSmsTransport implements Transport {
  readonly channel = 'sms' as const;

  constructor(private readonly options: CompositeSmsTransportOptions) {}

  async send(message: Message): Promise<TransportResult> {
    const causes: unknown[] = [];

    for (const transport of this.options.transports) {
      try {
        return await transport.send(message);
      } catch (error) {
        causes.push(error);
      }
    }

    throw new AllTransportsFailedError(causes);
  }
}
