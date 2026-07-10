import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';
import {
  MissingVoiceConfigError,
  VoiceRequestError,
  type FetchLike,
  type VoiceConfigProvider,
} from './types.js';

interface VoiceCallResponse {
  readonly callId?: string;
}

export interface VoiceTransportOptions {
  readonly configProvider: VoiceConfigProvider;
  readonly fetchFn?: FetchLike;
}

/**
 * Places an outbound call whose spoken content is `message.body` (the
 * provider's text-to-speech / IVR script engine handles the rest). See
 * types.ts for why this is a REST call and not raw SIP signaling.
 */
export class VoiceTransport implements Transport {
  readonly channel = 'voice' as const;

  private readonly fetchFn: FetchLike;

  constructor(private readonly options: VoiceTransportOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async send(message: Message): Promise<TransportResult> {
    const config = await this.options.configProvider.getConfig(message.tenantId);
    if (!config) {
      throw new MissingVoiceConfigError(message.tenantId);
    }

    const response = await this.fetchFn(
      `${config.apiBaseUrl}/accounts/${config.accountId}/calls`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          to: message.to,
          from: config.callerNumber,
          say: message.body,
        }),
      },
    );

    if (!response.ok) {
      throw new VoiceRequestError(response.status, await response.text());
    }

    const body = (await response.json()) as VoiceCallResponse;
    return { ...(body.callId !== undefined ? { providerRef: body.callId } : {}) };
  }
}
