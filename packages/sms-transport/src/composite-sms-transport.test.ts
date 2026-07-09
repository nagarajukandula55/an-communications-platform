import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import type { Transport } from '@acp/messaging';
import { AllTransportsFailedError, CompositeSmsTransport } from './composite-sms-transport.js';

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

function transport(name: string, fails: boolean): Transport {
  return {
    channel: 'sms',
    send: () =>
      fails
        ? Promise.reject(new Error(`${name} failed`))
        : Promise.resolve({ providerRef: name }),
  };
}

describe('CompositeSmsTransport', () => {
  it('uses the first transport when it succeeds', async () => {
    const composite = new CompositeSmsTransport({
      transports: [transport('primary', false), transport('fallback', false)],
    });

    const result = await composite.send(message);
    expect(result.providerRef).toBe('primary');
  });

  it('falls back to the next transport on failure', async () => {
    const composite = new CompositeSmsTransport({
      transports: [transport('primary', true), transport('fallback', false)],
    });

    const result = await composite.send(message);
    expect(result.providerRef).toBe('fallback');
  });

  it('throws AllTransportsFailedError when every transport fails', async () => {
    const composite = new CompositeSmsTransport({
      transports: [transport('primary', true), transport('fallback', true)],
    });

    await expect(composite.send(message)).rejects.toBeInstanceOf(
      AllTransportsFailedError,
    );
  });
});
