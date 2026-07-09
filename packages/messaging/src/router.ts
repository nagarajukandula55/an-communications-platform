import type { Channel, Message } from '@acp/types';

export interface TransportResult {
  readonly providerRef?: string;
}

export interface Transport {
  readonly channel: Channel;
  send(message: Message): Promise<TransportResult>;
}

export class NoTransportError extends Error {
  constructor(channel: Channel) {
    super(`No transport registered for channel: ${channel}`);
    this.name = 'NoTransportError';
  }
}

export class MessageRouter {
  private readonly transports = new Map<Channel, Transport>();

  register(transport: Transport): void {
    this.transports.set(transport.channel, transport);
  }

  resolve(channel: Channel): Transport {
    const transport = this.transports.get(channel);
    if (!transport) {
      throw new NoTransportError(channel);
    }
    return transport;
  }

  async route(message: Message): Promise<TransportResult> {
    const transport = this.resolve(message.channel);
    return transport.send(message);
  }
}
