import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
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
import type { FastifyInstance } from 'fastify';
import { buildApp } from './build-app.js';
import { issueDeviceToken } from './gateway.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

async function startServer() {
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

  app = await buildApp({ auth, devices, deviceTokens });
  const address = await app.listen({ host: '127.0.0.1', port: 0 });

  const device = await devices.register('org-1', 'Pixel 8');
  const token = await issueDeviceToken(deviceTokens, 'org-1', device.id);

  return { address, token, deviceId: device.id };
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
});
