import { describe, expect, it } from 'vitest';
import { EventBus } from '@acp/events';
import {
  InMemoryDeviceTokenRepository,
  type DeviceTokenRepository,
} from '@acp/auth';
import { DeviceService, InMemoryDeviceRepository } from '@acp/devices';
import {
  handleGatewayMessage,
  issueDeviceToken,
  type GatewayConnectionState,
} from './gateway.js';

async function createDeps() {
  const deviceTokens: DeviceTokenRepository = new InMemoryDeviceTokenRepository();
  const deviceRepository = new InMemoryDeviceRepository();
  const events = new EventBus();
  const devices = new DeviceService(deviceRepository, events);

  const device = await devices.register('org-1', 'Pixel 8');
  const token = await issueDeviceToken(deviceTokens, 'org-1', device.id);

  return { deviceTokens, devices, deviceRepository, device, token };
}

describe('handleGatewayMessage', () => {
  it('rejects malformed JSON', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = {};

    const result = await handleGatewayMessage(deps, state, 'not json');
    expect(result.reply).toEqual({ type: 'error', message: 'Invalid message' });
  });

  it('authenticates a valid device token', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = {};

    const result = await handleGatewayMessage(
      deps,
      state,
      JSON.stringify({ type: 'auth', token: deps.token }),
    );

    expect(result.reply).toEqual({
      type: 'authenticated',
      deviceId: deps.device.id,
    });
    expect(state.deviceId).toBe(deps.device.id);
  });

  it('rejects an invalid device token and closes the connection', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = {};

    const result = await handleGatewayMessage(
      deps,
      state,
      JSON.stringify({ type: 'auth', token: 'acp_bogus' }),
    );

    expect(result.shouldClose).toBe(true);
    expect(state.deviceId).toBeUndefined();
  });

  it('rejects a heartbeat before authentication', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = {};

    const result = await handleGatewayMessage(
      deps,
      state,
      JSON.stringify({ type: 'heartbeat' }),
    );

    expect(result.shouldClose).toBe(true);
  });

  it('processes a heartbeat after authentication', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = { deviceId: deps.device.id };

    const result = await handleGatewayMessage(
      deps,
      state,
      JSON.stringify({ type: 'heartbeat' }),
    );

    expect(result.reply).toEqual({ type: 'heartbeat_ack' });
    const stored = await deps.deviceRepository.findById(deps.device.id);
    expect(stored?.status).toBe('online');
  });

  it('rejects sms_received before authentication', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = {};

    const result = await handleGatewayMessage(
      deps,
      state,
      JSON.stringify({
        type: 'sms_received',
        from: '+15551234567',
        body: 'hello',
        receivedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    expect(result.reply).toEqual({ type: 'error', message: 'Not authenticated' });
    expect(result.shouldClose).toBe(true);
  });

  it('forwards an authenticated sms_received message to onSmsReceived', async () => {
    const deps = await createDeps();
    const state: GatewayConnectionState = { deviceId: deps.device.id };
    const received: unknown[] = [];

    const result = await handleGatewayMessage(
      { ...deps, onSmsReceived: (deviceId, message) => received.push({ deviceId, message }) },
      state,
      JSON.stringify({
        type: 'sms_received',
        from: '+15551234567',
        body: 'hello',
        receivedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    expect(result.reply).toBeUndefined();
    expect(received).toEqual([
      {
        deviceId: deps.device.id,
        message: {
          from: '+15551234567',
          body: 'hello',
          receivedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);
  });
});
