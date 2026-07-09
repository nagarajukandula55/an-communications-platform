import type { Device, Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';
import type { DeviceSelector } from './device-selector.js';

export interface SmsDispatchResult {
  readonly providerRef?: string;
}

export interface DeviceCommandDispatcher {
  sendSms(
    deviceId: string,
    command: { readonly to: string; readonly body: string; readonly messageId: string },
  ): Promise<SmsDispatchResult>;
}

export interface DeviceDirectory {
  listOnlineByTenant(tenantId: string): Promise<Device[]>;
}

export class NoDeviceAvailableError extends Error {
  constructor(tenantId: string) {
    super(`No online Android gateway device available for tenant: ${tenantId}`);
    this.name = 'NoDeviceAvailableError';
  }
}

export class AndroidGatewayTransport implements Transport {
  readonly channel = 'sms' as const;

  constructor(
    private readonly directory: DeviceDirectory,
    private readonly dispatcher: DeviceCommandDispatcher,
    private readonly selector: DeviceSelector,
  ) {}

  async send(message: Message): Promise<TransportResult> {
    const devices = await this.directory.listOnlineByTenant(message.tenantId);
    const device = this.selector.select(devices);
    if (!device) {
      throw new NoDeviceAvailableError(message.tenantId);
    }

    const result = await this.dispatcher.sendSms(device.id, {
      to: message.to,
      body: message.body,
      messageId: message.id,
    });

    return { ...(result.providerRef !== undefined ? { providerRef: result.providerRef } : {}) };
  }
}
