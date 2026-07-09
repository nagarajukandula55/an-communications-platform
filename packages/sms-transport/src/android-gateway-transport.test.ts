import { describe, expect, it } from 'vitest';
import type { Device, Message } from '@acp/types';
import {
  AndroidGatewayTransport,
  NoDeviceAvailableError,
  type DeviceCommandDispatcher,
  type DeviceDirectory,
} from './android-gateway-transport.js';
import { RoundRobinDeviceSelector } from './device-selector.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'sms',
  to: '+10000000000',
  body: 'hello',
  status: 'queued',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('AndroidGatewayTransport', () => {
  it('dispatches to the selected online device', async () => {
    const directory: DeviceDirectory = {
      listOnlineByTenant: () =>
        Promise.resolve<Device[]>([
          { id: 'd1', tenantId: 't1', name: 'Pixel', status: 'online' },
        ]),
    };
    const dispatcher: DeviceCommandDispatcher = {
      sendSms: (deviceId) =>
        Promise.resolve({ providerRef: `ref-${deviceId}` }),
    };

    const transport = new AndroidGatewayTransport(
      directory,
      dispatcher,
      new RoundRobinDeviceSelector(),
    );

    const result = await transport.send(message);
    expect(result.providerRef).toBe('ref-d1');
  });

  it('throws NoDeviceAvailableError when no devices are online', async () => {
    const directory: DeviceDirectory = { listOnlineByTenant: () => Promise.resolve([]) };
    const dispatcher: DeviceCommandDispatcher = {
      sendSms: () => Promise.resolve({}),
    };

    const transport = new AndroidGatewayTransport(
      directory,
      dispatcher,
      new RoundRobinDeviceSelector(),
    );

    await expect(transport.send(message)).rejects.toBeInstanceOf(
      NoDeviceAvailableError,
    );
  });
});
