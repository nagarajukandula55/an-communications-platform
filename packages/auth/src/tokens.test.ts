import { describe, expect, it } from 'vitest';
import { TokenService } from './tokens.js';

function createTokens() {
  return new TokenService({
    accessSecret: 'access-secret',
    refreshSecret: 'refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  });
}

describe('TokenService', () => {
  it('signs and verifies an access token', () => {
    const tokens = createTokens();
    const token = tokens.signAccessToken({
      sub: 'user-1',
      organizationId: 'org-1',
      role: 'owner',
    });

    const claims = tokens.verifyAccessToken(token);
    expect(claims).toMatchObject({
      sub: 'user-1',
      organizationId: 'org-1',
      role: 'owner',
    });
  });

  it('rejects an access token verified with the wrong secret', () => {
    const tokens = createTokens();
    const token = tokens.signAccessToken({
      sub: 'user-1',
      organizationId: 'org-1',
      role: 'owner',
    });

    const otherTokens = new TokenService({
      accessSecret: 'different-secret',
      refreshSecret: 'refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '30d',
    });

    expect(() => otherTokens.verifyAccessToken(token)).toThrow();
  });

  it('issues a refresh token with a matching jti and future expiry', () => {
    const tokens = createTokens();
    const issued = tokens.issueRefreshToken('user-1');

    const { sub, jti } = tokens.verifyRefreshToken(issued.token);
    expect(sub).toBe('user-1');
    expect(jti).toBe(issued.id);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
