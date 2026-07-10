import { describe, expect, it } from 'vitest';
import { InMemoryAnalyticsRepository } from '@acp/analytics';
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
import {
  InMemoryIntegrationRepository,
  IntegrationsService,
} from '@acp/integrations';
import { InMemoryWebhookRepository } from '@acp/webhooks';
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
  const analytics = new InMemoryAnalyticsRepository([]);
  const integrations = new IntegrationsService(
    new InMemoryIntegrationRepository(),
    { encryptionSecret: 'test-secret' },
  );
  const webhooks = new InMemoryWebhookRepository();

  const { app } = await buildApp({
    auth,
    tokens,
    devices,
    deviceTokens,
    analytics,
    integrations,
    webhooks,
  });
  return app;
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

  it('rejects /devices without a bearer token', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/devices' });
    expect(response.statusCode).toBe(401);
  });

  it('lists devices for the authenticated organization', async () => {
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
    const registered: { accessToken: string } = register.json();

    const response = await app.inject({
      method: 'GET',
      url: '/devices',
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ devices: [] });
  });

  it('rejects /analytics without a bearer token', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/analytics' });
    expect(response.statusCode).toBe(401);
  });

  it('returns delivery stats for the authenticated organization', async () => {
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
    const registered: { accessToken: string } = register.json();

    const response = await app.inject({
      method: 'GET',
      url: '/analytics',
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ total: 0, byStatus: {}, byChannel: {} });
  });

  it('saves and reads back a masked integration config', async () => {
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
    const registered: { accessToken: string } = register.json();
    const authHeader = { authorization: `Bearer ${registered.accessToken}` };

    const put = await app.inject({
      method: 'PUT',
      url: '/integrations/smtp',
      headers: authHeader,
      payload: {
        host: 'smtp.example.com',
        port: '587',
        username: 'acp',
        password: 'super-secret',
        fromAddress: 'no-reply@example.com',
      },
    });
    expect(put.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: '/integrations/smtp',
      headers: authHeader,
    });
    expect(get.statusCode).toBe(200);
    const body: { provider: string; config: Record<string, string> } = get.json();
    expect(body.config.host).toBe('smtp.example.com');
    expect(body.config.password).not.toBe('super-secret');
  });

  it('rejects an unknown integration provider', async () => {
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
    const registered: { accessToken: string } = register.json();

    const response = await app.inject({
      method: 'GET',
      url: '/integrations/carrier-pigeon',
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('creates, lists, and deletes a webhook subscription', async () => {
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
    const registered: { accessToken: string } = register.json();
    const authHeader = { authorization: `Bearer ${registered.accessToken}` };

    const create = await app.inject({
      method: 'POST',
      url: '/webhooks',
      headers: authHeader,
      payload: { url: 'https://example.com/hook', events: ['MessageCreated'] },
    });
    expect(create.statusCode).toBe(201);
    const created: { id: string; secret: string } = create.json();
    expect(created.secret).toBeTruthy();

    const list = await app.inject({
      method: 'GET',
      url: '/webhooks',
      headers: authHeader,
    });
    expect(list.statusCode).toBe(200);
    const listed: { webhooks: { id: string; secret?: string }[] } = list.json();
    expect(listed.webhooks).toHaveLength(1);
    expect(listed.webhooks[0]?.secret).toBeUndefined();

    const del = await app.inject({
      method: 'DELETE',
      url: `/webhooks/${created.id}`,
      headers: authHeader,
    });
    expect(del.statusCode).toBe(204);

    const listAfter = await app.inject({
      method: 'GET',
      url: '/webhooks',
      headers: authHeader,
    });
    const afterBody: { webhooks: unknown[] } = listAfter.json();
    expect(afterBody.webhooks).toHaveLength(0);
  });

  it('rejects a webhook subscription with no valid event names', async () => {
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
    const registered: { accessToken: string } = register.json();

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks',
      headers: { authorization: `Bearer ${registered.accessToken}` },
      payload: { url: 'https://example.com/hook', events: ['NotARealEvent'] },
    });

    expect(response.statusCode).toBe(400);
  });
});
