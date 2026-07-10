import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FcmRequestError, FcmSender } from './fcm-sender.js';
import type { FcmConfig } from './types.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const config: FcmConfig = {
  projectId: 'proj',
  clientEmail: 'sa@proj.iam.gserviceaccount.com',
  privateKey,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('FcmSender', () => {
  it('exchanges a signed JWT for an access token, then sends the message', async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    const fetchFn = ((url: string, init?: RequestInit) => {
      requests.push({ url, init });
      if (url.includes('oauth2.googleapis.com')) {
        return Promise.resolve(jsonResponse({ access_token: 'fake-access-token' }));
      }
      return Promise.resolve(jsonResponse({ name: 'projects/proj/messages/123' }));
    }) as typeof fetch;

    const sender = new FcmSender(fetchFn);
    const result = await sender.send(config, 'device-token', {
      title: 'Hi',
      body: 'there',
    });

    expect(result.providerRef).toBe('projects/proj/messages/123');
    expect(requests).toHaveLength(2);
    expect(requests[1]?.url).toContain('proj/messages:send');
    const sendHeaders = requests[1]?.init?.headers as Record<string, string>;
    expect(sendHeaders.authorization).toBe('Bearer fake-access-token');
  });

  it('throws FcmRequestError on a non-ok token response', async () => {
    const fetchFn = (() =>
      Promise.resolve(jsonResponse({ error: 'invalid_grant' }, 400))) as typeof fetch;

    const sender = new FcmSender(fetchFn);
    await expect(
      sender.send(config, 'device-token', { title: 'Hi', body: 'there' }),
    ).rejects.toBeInstanceOf(FcmRequestError);
  });
});
