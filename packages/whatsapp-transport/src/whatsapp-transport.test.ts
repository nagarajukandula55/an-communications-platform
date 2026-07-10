import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import {
  MissingWhatsAppConfigError,
  WhatsAppRequestError,
  type WhatsAppConfig,
  type WhatsAppConfigProvider,
} from './types.js';
import { WhatsAppTransport } from './whatsapp-transport.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'whatsapp',
  to: '+10000000000',
  body: 'hello',
  status: 'queued',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const config: WhatsAppConfig = { phoneNumberId: '123', accessToken: 'token-abc' };

function configProvider(value?: WhatsAppConfig): WhatsAppConfigProvider {
  return { getConfig: () => Promise.resolve(value) };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('WhatsAppTransport', () => {
  it('sends a text message via the Cloud API', async () => {
    let capturedUrl = '';
    let capturedAuth: string | undefined;
    let capturedBody: unknown;

    const fetchFn: typeof fetch = (url, init) => {
      capturedUrl = url as string;
      capturedAuth = (init?.headers as Record<string, string>).authorization;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve(jsonResponse({ messages: [{ id: 'wamid.123' }] }));
    };

    const transport = new WhatsAppTransport({
      configProvider: configProvider(config),
      fetchFn,
    });

    const result = await transport.send(message);

    expect(result.providerRef).toBe('wamid.123');
    expect(capturedUrl).toContain('/123/messages');
    expect(capturedAuth).toBe('Bearer token-abc');
    expect(capturedBody).toMatchObject({
      messaging_product: 'whatsapp',
      to: '+10000000000',
      text: { body: 'hello' },
    });
  });

  it('throws MissingWhatsAppConfigError when unset', async () => {
    const transport = new WhatsAppTransport({ configProvider: configProvider() });
    await expect(transport.send(message)).rejects.toBeInstanceOf(
      MissingWhatsAppConfigError,
    );
  });

  it('throws WhatsAppRequestError on a non-ok response', async () => {
    const fetchFn: typeof fetch = () =>
      Promise.resolve(jsonResponse({ error: 'bad request' }, 400));

    const transport = new WhatsAppTransport({
      configProvider: configProvider(config),
      fetchFn,
    });

    await expect(transport.send(message)).rejects.toBeInstanceOf(
      WhatsAppRequestError,
    );
  });
});
