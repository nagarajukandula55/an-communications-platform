import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import {
  MissingVoiceConfigError,
  VoiceRequestError,
  type VoiceConfig,
  type VoiceConfigProvider,
} from './types.js';
import { VoiceTransport } from './voice-transport.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'voice',
  to: '+10000000000',
  body: 'Your one time code is 4 2 1 9.',
  status: 'queued',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const config: VoiceConfig = {
  apiBaseUrl: 'https://voice.example.com',
  accountId: 'acct-1',
  apiKey: 'key-abc',
  callerNumber: '+19999999999',
};

function configProvider(value?: VoiceConfig): VoiceConfigProvider {
  return { getConfig: () => Promise.resolve(value) };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('VoiceTransport', () => {
  it('places a call with the message body as the spoken script', async () => {
    let capturedUrl = '';
    let capturedBody: unknown;

    const fetchFn: typeof fetch = (url, init) => {
      capturedUrl = url as string;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve(jsonResponse({ callId: 'call-123' }));
    };

    const transport = new VoiceTransport({
      configProvider: configProvider(config),
      fetchFn,
    });

    const result = await transport.send(message);

    expect(result.providerRef).toBe('call-123');
    expect(capturedUrl).toBe('https://voice.example.com/accounts/acct-1/calls');
    expect(capturedBody).toMatchObject({
      to: '+10000000000',
      from: '+19999999999',
      say: message.body,
    });
  });

  it('throws MissingVoiceConfigError when unset', async () => {
    const transport = new VoiceTransport({ configProvider: configProvider() });
    await expect(transport.send(message)).rejects.toBeInstanceOf(
      MissingVoiceConfigError,
    );
  });

  it('throws VoiceRequestError on a non-ok response', async () => {
    const fetchFn: typeof fetch = () =>
      Promise.resolve(jsonResponse({ error: 'no route' }, 502));

    const transport = new VoiceTransport({
      configProvider: configProvider(config),
      fetchFn,
    });

    await expect(transport.send(message)).rejects.toBeInstanceOf(VoiceRequestError);
  });
});
