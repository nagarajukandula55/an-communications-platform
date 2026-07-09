import type { Message } from '@acp/types';
import type { Transport, TransportResult } from '@acp/messaging';

/**
 * Abstraction over an AT-command serial channel so this transport is
 * testable without real modem hardware. A real implementation wraps the
 * `serialport` package and speaks GSM 07.05 (AT+CMGS etc.) over it; that
 * implementation is not included here since it can't be verified without
 * physical hardware.
 */
export interface AtCommandChannel {
  sendCommand(command: string): Promise<string>;
}

export class ModemError extends Error {
  constructor(response: string) {
    super(`GSM modem rejected command: ${response}`);
    this.name = 'ModemError';
  }
}

const CTRL_Z = '';

export class GsmModemTransport implements Transport {
  readonly channel = 'sms' as const;

  constructor(private readonly channelPort: AtCommandChannel) {}

  async send(message: Message): Promise<TransportResult> {
    await this.channelPort.sendCommand('AT+CMGF=1');
    await this.channelPort.sendCommand(`AT+CMGS="${message.to}"`);
    const response = await this.channelPort.sendCommand(`${message.body}${CTRL_Z}`);

    if (!response.includes('OK')) {
      throw new ModemError(response);
    }

    const match = /\+CMGS:\s*(\d+)/.exec(response);
    return match?.[1] !== undefined ? { providerRef: match[1] } : {};
  }
}
