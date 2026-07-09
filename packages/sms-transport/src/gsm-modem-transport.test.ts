import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import { GsmModemTransport, ModemError, type AtCommandChannel } from './gsm-modem-transport.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'sms',
  to: '+10000000000',
  body: 'hello',
  status: 'queued',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('GsmModemTransport', () => {
  it('sends the standard AT command sequence and extracts the message ref', async () => {
    const commands: string[] = [];
    const channel: AtCommandChannel = {
      sendCommand: (command) => {
        commands.push(command);
        if (command.startsWith('AT+CMGF')) return Promise.resolve('OK');
        if (command.startsWith('AT+CMGS=')) return Promise.resolve('>');
        return Promise.resolve('+CMGS: 42\nOK');
      },
    };

    const transport = new GsmModemTransport(channel);
    const result = await transport.send(message);

    expect(commands[0]).toBe('AT+CMGF=1');
    expect(commands[1]).toBe('AT+CMGS="+10000000000"');
    expect(result.providerRef).toBe('42');
  });

  it('throws ModemError when the modem does not acknowledge OK', async () => {
    const channel: AtCommandChannel = {
      sendCommand: () => Promise.resolve('ERROR'),
    };

    const transport = new GsmModemTransport(channel);
    await expect(transport.send(message)).rejects.toBeInstanceOf(ModemError);
  });
});
