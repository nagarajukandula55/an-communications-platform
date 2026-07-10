import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';
import { ApnsSender } from './apns-sender.js';
import { FcmSender } from './fcm-sender.js';
import {
  MissingPushConfigError,
  UnknownPushPlatformError,
  type PushConfigProvider,
  type PushPlatform,
} from './types.js';

export interface PushTransportOptions {
  readonly configProvider: PushConfigProvider;
  readonly fcmSender?: FcmSender;
  readonly apnsSender?: ApnsSender;
  readonly defaultTitle?: string;
}

function readPlatform(message: Message): PushPlatform {
  const platform = message.metadata?.['platform'];
  if (platform === 'android' || platform === 'ios') {
    return platform;
  }
  throw new UnknownPushPlatformError(String(platform));
}

export class PushTransport implements Transport {
  readonly channel = 'push' as const;

  private readonly fcmSender: FcmSender;
  private readonly apnsSender: ApnsSender;
  private readonly defaultTitle: string;

  constructor(private readonly options: PushTransportOptions) {
    this.fcmSender = options.fcmSender ?? new FcmSender();
    this.apnsSender = options.apnsSender ?? new ApnsSender();
    this.defaultTitle = options.defaultTitle ?? 'Notification';
  }

  async send(message: Message): Promise<TransportResult> {
    const platform = readPlatform(message);
    const notification = {
      title:
        typeof message.metadata?.['title'] === 'string'
          ? message.metadata['title']
          : this.defaultTitle,
      body: message.body,
    };

    if (platform === 'android') {
      const config = await this.options.configProvider.getFcmConfig(message.tenantId);
      if (!config) {
        throw new MissingPushConfigError(message.tenantId, platform);
      }
      return this.fcmSender.send(config, message.to, notification);
    }

    const config = await this.options.configProvider.getApnsConfig(message.tenantId);
    if (!config) {
      throw new MissingPushConfigError(message.tenantId, platform);
    }
    return this.apnsSender.send(config, message.to, notification);
  }
}
