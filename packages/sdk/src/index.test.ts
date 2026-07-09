import { describe, expect, it } from 'vitest';
import { ApiClient, ApiError } from './index.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ApiClient', () => {
  it('sends an authorized request and parses the response', async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    const fetchFn: typeof fetch = (url, init) => {
      capturedUrl = url as string;
      capturedInit = init;
      return Promise.resolve(jsonResponse({ ok: true }));
    };

    const client = new ApiClient({
      baseUrl: 'https://api.example.com/',
      apiKey: 'secret',
      fetchFn,
    });

    const result = await client.request<{ ok: boolean }>('/messages');

    expect(result).toEqual({ ok: true });
    expect(capturedUrl).toBe('https://api.example.com/messages');
    expect((capturedInit?.headers as Headers).get('authorization')).toBe(
      'Bearer secret',
    );
  });

  it('throws ApiError on non-ok responses', async () => {
    const fetchFn: typeof fetch = () =>
      Promise.resolve(jsonResponse({ message: 'bad request' }, 400));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'secret',
      fetchFn,
    });

    await expect(client.request('/messages')).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
