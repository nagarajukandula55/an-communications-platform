import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ApnsRequestError, ApnsSender } from './apns-sender.js';
import type { ApnsConfig } from './types.js';

const { privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const config: ApnsConfig = {
  teamId: 'team',
  keyId: 'key',
  bundleId: 'com.example.app',
  privateKey,
};

function response(status: number, apnsId?: string): Response {
  return new Response('{}', {
    status,
    headers: apnsId ? { 'apns-id': apnsId } : {},
  });
}

describe('ApnsSender', () => {
  it('posts to the device endpoint with a bearer JWT and the apns-topic header', async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    const fetchFn = ((url: string, init?: RequestInit) => {
      requests.push({ url, init });
      return Promise.resolve(response(200, 'apns-id-123'));
    }) as typeof fetch;

    const sender = new ApnsSender(fetchFn, 'https://api.push.apple.com');
    const result = await sender.send(config, 'device-token', {
      title: 'Hi',
      body: 'there',
    });

    expect(result.providerRef).toBe('apns-id-123');
    expect(requests[0]?.url).toBe('https://api.push.apple.com/3/device/device-token');
    const headers = requests[0]?.init?.headers as Record<string, string>;
    expect(headers['apns-topic']).toBe('com.example.app');
    expect(headers.authorization).toMatch(/^bearer /);
  });

  it('throws ApnsRequestError on a non-ok response', async () => {
    const fetchFn = (() => Promise.resolve(response(400))) as typeof fetch;
    const sender = new ApnsSender(fetchFn);

    await expect(
      sender.send(config, 'device-token', { title: 'Hi', body: 'there' }),
    ).rejects.toBeInstanceOf(ApnsRequestError);
  });
});
