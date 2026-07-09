import { describe, expect, it } from 'vitest';
import { EventBus } from '@acp/events';
import {
  AuthService,
  InMemoryApiKeyRepository,
  InMemoryDeviceTokenRepository,
  InMemoryOrganizationRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  TokenService,
} from '@acp/auth';
import { DeviceService, InMemoryDeviceRepository } from '@acp/devices';
import { buildApp } from './build-app.js';

async function createApp() {
  const tokens = new TokenService({
    accessSecret: 'access-secret',
    refreshSecret: 'refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  });
  const auth = new AuthService({
    users: new InMemoryUserRepository(),
    organizations: new InMemoryOrganizationRepository(),
    apiKeys: new InMemoryApiKeyRepository(),
    refreshTokens: new InMemoryRefreshTokenRepository(),
    tokens,
  });
  const devices = new DeviceService(
    new InMemoryDeviceRepository(),
    new EventBus(),
  );
  const deviceTokens = new InMemoryDeviceTokenRepository();

  return buildApp({ auth, devices, deviceTokens });
}

describe('API app', () => {
  it('reports healthy', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('registers, logs in, and refreshes a session', async () => {
    const app = await createApp();

    const register = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        organizationName: 'Acme',
        email: 'owner@acme.test',
        password: 'correct-horse-battery-staple',
      },
    });
    expect(register.statusCode).toBe(201);
    const registered: { user: { organizationId: string }; refreshToken: string } =
      register.json();

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        organizationId: registered.user.organizationId,
        email: 'owner@acme.test',
        password: 'correct-horse-battery-staple',
      },
    });
    expect(login.statusCode).toBe(200);

    const refresh = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: registered.refreshToken },
    });
    expect(refresh.statusCode).toBe(200);
  });

  it('rejects login with wrong credentials', async () => {
    const app = await createApp();

    const register = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        organizationName: 'Acme',
        email: 'owner@acme.test',
        password: 'correct-horse-battery-staple',
      },
    });
    const registered: { user: { organizationId: string } } = register.json();

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        organizationId: registered.user.organizationId,
        email: 'owner@acme.test',
        password: 'wrong',
      },
    });

    expect(login.statusCode).toBe(401);
  });
});
