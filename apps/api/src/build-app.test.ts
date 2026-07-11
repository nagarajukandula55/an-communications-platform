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
import { SsoTokenInvalidError, type SsoClient } from '@acp/sso-client';
import { buildApp } from './build-app.js';

async function createApp(sso?: SsoClient) {
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

  const { app } = await buildApp(
    {
      auth,
      tokens,
      devices,
      deviceTokens,
      analytics,
      integrations,
      webhooks,
      ...(sso ? { sso } : {}),
    },
    { rateLimit: false },
  );
  return app;
}

describe('API app', () => {
  it('reports healthy', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('exposes Prometheus metrics including a request for /health', async () => {
    const app = await createApp();
    await app.inject({ method: 'GET', url: '/health' });

    const response = await app.inject({ method: 'GET', url: '/metrics' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('acp_http_requests_total');
    expect(response.body).toContain('route="/health"');
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

  it('registers a device and issues it a usable gateway token', async () => {
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
      url: '/devices',
      headers: { authorization: `Bearer ${registered.accessToken}` },
      payload: { name: 'Pixel 8' },
    });

    expect(response.statusCode).toBe(201);
    const body: { device: { id: string; name: string }; token: string } = response.json();
    expect(body.device.name).toBe('Pixel 8');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);

    const list = await app.inject({
      method: 'GET',
      url: '/devices',
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });
    expect(list.json()).toEqual({ devices: [body.device] });
  });

  it('rejects device registration without a bearer token', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/devices',
      payload: { name: 'Pixel 8' },
    });
    expect(response.statusCode).toBe(401);
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

  it('rate-limits repeated /auth/login attempts', async () => {
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
    const devices = new DeviceService(new InMemoryDeviceRepository(), new EventBus());
    const deviceTokens = new InMemoryDeviceTokenRepository();
    const analytics = new InMemoryAnalyticsRepository([]);
    const integrations = new IntegrationsService(new InMemoryIntegrationRepository(), {
      encryptionSecret: 'test-secret',
    });
    const webhooks = new InMemoryWebhookRepository();

    const { app } = await buildApp(
      { auth, tokens, devices, deviceTokens, analytics, integrations, webhooks },
      { rateLimit: true },
    );

    const payload = {
      organizationId: 'org-1',
      email: 'nobody@acme.test',
      password: 'wrong',
    };

    const responses = [];
    for (let i = 0; i < 6; i++) {
      responses.push(await app.inject({ method: 'POST', url: '/auth/login', payload }));
    }

    expect(responses.slice(0, 5).every((response) => response.statusCode === 401)).toBe(
      true,
    );
    expect(responses[5]?.statusCode).toBe(429);
  });

  it('sends security headers via helmet', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('ANgroup SSO', () => {
  it('returns 501 for /auth/sso/callback when SSO is not configured', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/sso/callback',
      payload: { ssoToken: 'anything' },
    });

    expect(response.statusCode).toBe(501);
  });

  it('rejects an invalid SSO token', async () => {
    const sso = {
      verify: () =>
        Promise.reject(new SsoTokenInvalidError('Invalid or expired SSO token')),
    } as unknown as SsoClient;

    const app = await createApp(sso);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/sso/callback',
      payload: { ssoToken: 'bad-token' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('logs in via a verified SSO token and auto-provisions the org/user', async () => {
    const sso = {
      verify: () =>
        Promise.resolve({
          id: 'sso-user-1',
          email: 'staff@angroup.in',
          name: 'AN Group Staff',
          username: null,
          role: 'MEMBER',
          isSuperAdmin: false,
          avatar: null,
          businessIds: ['biz-1'],
          activeBusinessId: 'biz-1',
          memberType: 'STAFF',
          vendorMemberships: [],
        }),
    } as unknown as SsoClient;

    const app = await createApp(sso);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/sso/callback',
      payload: { ssoToken: 'good-token' },
    });

    expect(response.statusCode).toBe(200);
    const body: { user: { email: string; isSuperAdmin: boolean } } = response.json();
    expect(body.user.email).toBe('staff@angroup.in');
    expect(body.user.isSuperAdmin).toBe(false);
  });

  it('blocks plain password login for non-super-admin users once SSO is configured', async () => {
    const sso = { verify: () => Promise.reject(new Error('unused')) } as unknown as SsoClient;
    const app = await createApp(sso);

    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        organizationName: 'Acme',
        email: 'owner2@acme.test',
        password: 'correct-horse-battery-staple',
      },
    });
    const { user }: { user: { organizationId: string } } = registered.json();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        organizationId: user.organizationId,
        email: 'owner2@acme.test',
        password: 'correct-horse-battery-staple',
      },
    });

    expect(response.statusCode).toBe(403);
    const body: { ssoRequired: boolean } = response.json();
    expect(body.ssoRequired).toBe(true);
  });
});
