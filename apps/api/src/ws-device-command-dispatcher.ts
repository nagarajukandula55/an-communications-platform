import type {
  DeviceCommandDispatcher,
  SmsDispatchResult,
} from '@acp/sms-transport';
import type { ConnectionRegistry } from './connection-registry.js';
import type { GatewayOutboundMessage, SmsResultEvent } from './gateway.js';

export class DeviceOfflineError extends Error {
  constructor(deviceId: string) {
    super(`Device is not connected: ${deviceId}`);
    this.name = 'DeviceOfflineError';
  }
}

export class SmsDispatchTimeoutError extends Error {
  constructor(deviceId: string) {
    super(`Device did not acknowledge SMS in time: ${deviceId}`);
    this.name = 'SmsDispatchTimeoutError';
  }
}

export interface WsDeviceCommandDispatcherOptions {
  readonly registry: ConnectionRegistry;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class WsDeviceCommandDispatcher implements DeviceCommandDispatcher {
  private readonly pending = new Map<
    string,
    { resolve: (result: SmsDispatchResult) => void; reject: (error: Error) => void }
  >();
  private readonly timeoutMs: number;

  constructor(private readonly options: WsDeviceCommandDispatcherOptions) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  sendSms(
    deviceId: string,
    command: { readonly to: string; readonly body: string; readonly messageId: string },
  ): Promise<SmsDispatchResult> {
    const socket = this.options.registry.get(deviceId);
    if (!socket) {
      return Promise.reject(new DeviceOfflineError(deviceId));
    }

    return new Promise<SmsDispatchResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.messageId);
        reject(new SmsDispatchTimeoutError(deviceId));
      }, this.timeoutMs);

      this.pending.set(command.messageId, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      const outbound: GatewayOutboundMessage = {
        type: 'send_sms',
        messageId: command.messageId,
        to: command.to,
        body: command.body,
      };
      socket.send(JSON.stringify(outbound));
    });
  }

  handleSmsResult(messageId: string, result: SmsResultEvent): void {
    const entry = this.pending.get(messageId);
    if (!entry) {
      return;
    }
    this.pending.delete(messageId);

    if (result.accepted) {
      entry.resolve({
        ...(result.providerRef !== undefined ? { providerRef: result.providerRef } : {}),
      });
    } else {
      entry.reject(new Error(result.error ?? 'Device rejected SMS'));
    }
  }
}
