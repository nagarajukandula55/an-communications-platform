import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client.js';
import { AcpClient } from './acp-client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AcpClient', () => {
  it('registers without requiring an access token', async () => {
    let capturedHeaders: Headers | undefined;
    const fetchFn: typeof fetch = (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return Promise.resolve(
        jsonResponse({
          user: { id: '1', organizationId: 'org-1', email: 'a@b.com', role: 'owner' },
          accessToken: 'access',
          refreshToken: 'refresh',
        }),
      );
    };

    const client = new AcpClient({ baseUrl: 'https://api.example.com', fetchFn });
    const session = await client.register('Acme', 'a@b.com', 'password123');

    expect(session.accessToken).toBe('access');
    expect(capturedHeaders?.has('authorization')).toBe(false);
  });

  it('lists devices with an authorization header', async () => {
    let capturedAuth: string | null = null;
    const fetchFn: typeof fetch = (_url, init) => {
      capturedAuth = new Headers(init?.headers).get('authorization');
      return Promise.resolve(jsonResponse({ devices: [] }));
    };

    const client = new AcpClient({ baseUrl: 'https://api.example.com', fetchFn });
    const devices = await client.listDevices('token-123');

    expect(devices).toEqual([]);
    expect(capturedAuth).toBe('Bearer token-123');
  });

  it('fetches analytics', async () => {
    const fetchFn: typeof fetch = () =>
      Promise.resolve(jsonResponse({ total: 5, byStatus: {}, byChannel: {} }));

    const client = new AcpClient({ baseUrl: 'https://api.example.com', fetchFn });
    const stats = await client.getAnalytics('token-123');

    expect(stats.total).toBe(5);
  });

  it('throws ApiError on a failed request', async () => {
    const fetchFn: typeof fetch = () =>
      Promise.resolve(jsonResponse({ message: 'nope' }, 401));

    const client = new AcpClient({ baseUrl: 'https://api.example.com', fetchFn });
    await expect(client.listDevices('bad-token')).rejects.toBeInstanceOf(ApiError);
  });

  it('sets integration config via PUT', async () => {
    let capturedMethod: string | undefined;
    let capturedBody: unknown;
    const fetchFn: typeof fetch = (_url, init) => {
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve(new Response(null, { status: 204 }));
    };

    const client = new AcpClient({ baseUrl: 'https://api.example.com', fetchFn });
    await client.setIntegrationConfig('token-123', 'smtp', { host: 'smtp.example.com' });

    expect(capturedMethod).toBe('PUT');
    expect(capturedBody).toEqual({ host: 'smtp.example.com' });
  });
});
