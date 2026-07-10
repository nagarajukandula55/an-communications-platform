import { describe, expect, it, vi } from 'vitest';
import { SsoClient } from './client.js';
import { SsoTokenInvalidError, type SsoVerifyResult } from './types.js';

function jsonResponse(status: number, body: SsoVerifyResult): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SsoClient', () => {
  it('posts the token to /api/sso/verify and returns the user on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        valid: true,
        user: {
          id: 'u1',
          email: 'admin@angroup.in',
          name: 'Admin',
          username: null,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          avatar: null,
          businessIds: ['b1'],
          activeBusinessId: 'b1',
          memberType: null,
          vendorMemberships: [],
        },
        permissions: ['profile', 'email'],
        issuer: 'an-group-erp',
      }),
    );
    const client = new SsoClient({ baseUrl: 'https://angroup.in/', fetchImpl });

    const user = await client.verify('token-123');

    expect(user.email).toBe('admin@angroup.in');
    expect(user.isSuperAdmin).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://angroup.in/api/sso/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'token-123' }),
      }),
    );
  });

  it('throws SsoTokenInvalidError when the token is invalid', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { valid: false, message: 'Invalid or expired SSO token' }));
    const client = new SsoClient({ baseUrl: 'https://angroup.in', fetchImpl });

    await expect(client.verify('bad-token')).rejects.toThrow(SsoTokenInvalidError);
  });

  it('throws when the response is ok but valid is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { valid: false }));
    const client = new SsoClient({ baseUrl: 'https://angroup.in', fetchImpl });

    await expect(client.verify('token')).rejects.toThrow(SsoTokenInvalidError);
  });
});
