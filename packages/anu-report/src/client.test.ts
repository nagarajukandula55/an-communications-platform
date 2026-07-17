import { describe, expect, it, vi } from 'vitest';
import { AnuReportClient } from './client.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('AnuReportClient', () => {
  it('posts to /api/anu/issues with x-service-key and returns the created id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, id: 'issue-1' }));
    const client = new AnuReportClient({ baseUrl: 'https://angroup.in', serviceKey: 'secret', fetchImpl });

    const result = await client.report({
      title: 'SMS transport down',
      description: 'All 3 configured devices offline',
      severity: 'HIGH',
      source: 'acp-sms-transport',
    });

    expect(result).toEqual({ ok: true, id: 'issue-1' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://angroup.in/api/anu/issues',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-service-key': 'secret' }),
      }),
    );
  });

  it('strips a trailing slash from baseUrl', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, id: 'issue-2' }));
    const client = new AnuReportClient({ baseUrl: 'https://angroup.in/', serviceKey: 'secret', fetchImpl });

    await client.report({ title: 't', description: 'd', source: 's' });

    expect(fetchImpl).toHaveBeenCalledWith('https://angroup.in/api/anu/issues', expect.anything());
  });

  it('returns ok: false on a non-2xx response instead of throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { success: false, message: 'Unauthorized' }));
    const client = new AnuReportClient({ baseUrl: 'https://angroup.in', serviceKey: 'wrong', fetchImpl });

    const result = await client.report({ title: 't', description: 'd', source: 's' });

    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('returns ok: false on a network failure instead of throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('connection refused'));
    const client = new AnuReportClient({ baseUrl: 'https://angroup.in', serviceKey: 'secret', fetchImpl });

    const result = await client.report({ title: 't', description: 'd', source: 's' });

    expect(result).toEqual({ ok: false, error: 'connection refused' });
  });
});
