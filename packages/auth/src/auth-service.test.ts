import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuthService,
  EmailInUseError,
  InvalidCredentialsError,
} from './auth-service.js';
import {
  InMemoryApiKeyRepository,
  InMemoryOrganizationRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './memory-repositories.js';
import { TokenService } from './tokens.js';

function createService() {
  const tokens = new TokenService({
    accessSecret: 'access-secret',
    refreshSecret: 'refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  });

  return new AuthService({
    users: new InMemoryUserRepository(),
    organizations: new InMemoryOrganizationRepository(),
    apiKeys: new InMemoryApiKeyRepository(),
    refreshTokens: new InMemoryRefreshTokenRepository(),
    tokens,
  });
}

describe('AuthService', () => {
  let service: ReturnType<typeof createService>;

  beforeEach(() => {
    service = createService();
  });

  it('registers a new organization and owner user', async () => {
    const session = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    expect(session.user.role).toBe('owner');
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
  });

  it('logs in with valid credentials', async () => {
    const registered = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    const session = await service.login({
      organizationId: registered.user.organizationId,
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    expect(session.user.id).toBe(registered.user.id);
  });

  it('rejects login with wrong password', async () => {
    const registered = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    await expect(
      service.login({
        organizationId: registered.user.organizationId,
        email: 'owner@acme.test',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('refreshes a session and rotates the refresh token', async () => {
    const registered = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    const refreshed = await service.refresh(registered.refreshToken);
    expect(refreshed.user.id).toBe(registered.user.id);

    await expect(service.refresh(registered.refreshToken)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('creates and verifies an api key', async () => {
    const { plaintext } = await service.createApiKey('org-1', 'CI key');
    const verified = await service.verifyApiKey(plaintext);

    expect(verified?.organizationId).toBe('org-1');
    await expect(service.verifyApiKey('acp_bogus')).resolves.toBeUndefined();
  });

  it('invites a member into an existing organization', async () => {
    const registered = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    const invited = await service.inviteUser({
      organizationId: registered.user.organizationId,
      email: 'member@acme.test',
      password: 'another-strong-password',
      role: 'member',
    });

    expect(invited.role).toBe('member');
    expect(invited.organizationId).toBe(registered.user.organizationId);
  });

  it('rejects inviting an email that already exists in the organization', async () => {
    const registered = await service.register({
      organizationName: 'Acme',
      email: 'owner@acme.test',
      password: 'correct-horse-battery-staple',
    });

    await expect(
      service.inviteUser({
        organizationId: registered.user.organizationId,
        email: 'owner@acme.test',
        password: 'another-strong-password',
        role: 'member',
      }),
    ).rejects.toBeInstanceOf(EmailInUseError);
  });
});
