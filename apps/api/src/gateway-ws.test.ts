import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
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
import type { FastifyInstance } from 'fastify';
import { buildApp, type BuiltApp } from './build-app.js';
import { issueDeviceToken } from './gateway.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

async function startServer(): Promise<
  Omit<BuiltApp, 'app'> & { address: string; token: string; deviceId: string }
> {
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
  const deviceTokens = new InMemoryDeviceTokenRepository();
  const devices = new DeviceService(new InMemoryDeviceRepository(), new EventBus());
  const analytics = new InMemoryAnalyticsRepository([]);
  const integrations = new IntegrationsService(
    new InMemoryIntegrationRepository(),
    { encryptionSecret: 'test-secret' },
  );

  const built = await buildApp({
    auth,
    tokens,
    devices,
    deviceTokens,
    analytics,
    integrations,
  });
  app = built.app;
  const address = await app.listen({ host: '127.0.0.1', port: 0 });

  const device = await devices.register('org-1', 'Pixel 8');
  const token = await issueDeviceToken(deviceTokens, 'org-1', device.id);

  return {
    connections: built.connections,
    smsDispatcher: built.smsDispatcher,
    address,
    token,
    deviceId: device.id,
  };
}

describe('gateway websocket', () => {
  it('authenticates and acknowledges a heartbeat over a real socket', async () => {
    const { address, token } = await startServer();
    const wsUrl = address.replace('http://', 'ws://') + '/gateway/ws';

    const messages: unknown[] = [];
    const socket = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'auth', token }));
      });
      socket.on('message', (data: Buffer) => {
        const parsed: unknown = JSON.parse(data.toString());
        messages.push(parsed);
        if (messages.length === 1) {
          socket.send(JSON.stringify({ type: 'heartbeat' }));
        } else if (messages.length === 2) {
          socket.close();
          resolve();
        }
      });
      socket.on('error', reject);
    });

    expect(messages[0]).toMatchObject({ type: 'authenticated' });
    expect(messages[1]).toEqual({ type: 'heartbeat_ack' });
  });

  it('dispatches an SMS command to the device and resolves on its result', async () => {
    const { address, token, deviceId, smsDispatcher } = await startServer();
    const wsUrl = address.replace('http://', 'ws://') + '/gateway/ws';

    const socket = new WebSocket(wsUrl);
    const received: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'auth', token }));
      });
      socket.on('message', (data: Buffer) => {
        const parsed: unknown = JSON.parse(data.toString());
        received.push(parsed);
        if (received.length === 1) {
          resolve();
        }
      });
      socket.on('error', reject);
    });

    const dispatchPromise = smsDispatcher.sendSms(deviceId, {
      to: '+10000000000',
      body: 'hello',
      messageId: 'msg-1',
    });

    const sendSmsMessage = await new Promise<{ messageId: string; to: string; body: string }>(
      (resolve) => {
        socket.once('message', (data: Buffer) => {
          const parsed = JSON.parse(data.toString()) as {
            messageId: string;
            to: string;
            body: string;
          };
          resolve(parsed);
        });
      },
    );
    expect(sendSmsMessage).toMatchObject({
      type: 'send_sms',
      to: '+10000000000',
      body: 'hello',
    });

    socket.send(
      JSON.stringify({
        type: 'sms_result',
        messageId: sendSmsMessage.messageId,
        accepted: true,
        providerRef: 'radio-42',
      }),
    );

    await expect(dispatchPromise).resolves.toEqual({ providerRef: 'radio-42' });
    socket.close();
  });
});
