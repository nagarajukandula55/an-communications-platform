import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';
import {
  MissingWhatsAppConfigError,
  WhatsAppRequestError,
  type FetchLike,
  type WhatsAppConfigProvider,
} from './types.js';

const GRAPH_API_VERSION = 'v21.0';

interface WhatsAppSendResponse {
  readonly messages?: readonly { readonly id: string }[];
}

export interface WhatsAppTransportOptions {
  readonly configProvider: WhatsAppConfigProvider;
  readonly fetchFn?: FetchLike;
  readonly apiBaseUrl?: string;
}

export class WhatsAppTransport implements Transport {
  readonly channel = 'whatsapp' as const;

  private readonly fetchFn: FetchLike;
  private readonly apiBaseUrl: string;

  constructor(private readonly options: WhatsAppTransportOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://graph.facebook.com';
  }

  async send(message: Message): Promise<TransportResult> {
    const config = await this.options.configProvider.getConfig(message.tenantId);
    if (!config) {
      throw new MissingWhatsAppConfigError(message.tenantId);
    }

    const response = await this.fetchFn(
      `${this.apiBaseUrl}/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'text',
          text: { body: message.body },
        }),
      },
    );

    if (!response.ok) {
      throw new WhatsAppRequestError(response.status, await response.text());
    }

    const body = (await response.json()) as WhatsAppSendResponse;
    const providerRef = body.messages?.[0]?.id;
    return { ...(providerRef !== undefined ? { providerRef } : {}) };
  }
}
