import { describe, expect, it } from 'vitest';
import { EventBus } from '@acp/events';
import type { Device } from '@acp/types';
import { DeviceNotFoundError, DeviceService } from './device-service.js';
import { InMemoryDeviceRepository } from './memory-repository.js';

function createService(offlineThresholdMs = 90_000) {
  const repository = new InMemoryDeviceRepository();
  const events = new EventBus();
  const service = new DeviceService(repository, events, {
    offlineThresholdMs,
  });
  return { repository, events, service };
}

describe('DeviceService', () => {
  it('lists devices scoped to a tenant', async () => {
    const { service } = createService();
    await service.register('t1', 'Pixel 8');
    await service.register('t1', 'Pixel 9');
    await service.register('t2', 'Other tenant device');

    const devices = await service.list('t1');
    expect(devices).toHaveLength(2);
    expect(devices.every((d) => d.tenantId === 't1')).toBe(true);
  });

  it('registers a device as offline', async () => {
    const { service } = createService();
    const device = await service.register('t1', 'Pixel 8');

    expect(device.status).toBe('offline');
    expect(device.tenantId).toBe('t1');
  });

  it('marks a device online on heartbeat and emits DeviceConnected once', async () => {
    const { service, events } = createService();
    const device = await service.register('t1', 'Pixel 8');

    const connected: Device[] = [];
    events.on('DeviceConnected', (d: Device) => {
      connected.push(d);
    });

    await service.heartbeat(device.id);
    await service.heartbeat(device.id);

    expect(connected).toHaveLength(1);
  });

  it('throws DeviceNotFoundError for an unknown device', async () => {
    const { service } = createService();
    await expect(service.heartbeat('missing')).rejects.toBeInstanceOf(
      DeviceNotFoundError,
    );
  });

  it('detects stale devices based on the offline threshold', async () => {
    const { service } = createService(1000);
    const device = await service.register('t1', 'Pixel 8');
    const heartbeatTime = new Date('2026-01-01T00:00:00.000Z');
    await service.heartbeat(device.id, heartbeatTime);

    const fresh = { ...device, status: 'online' as const, lastSeenAt: heartbeatTime.toISOString() };
    expect(service.isStale(fresh, new Date('2026-01-01T00:00:00.500Z'))).toBe(false);
    expect(service.isStale(fresh, new Date('2026-01-01T00:00:02.000Z'))).toBe(true);
  });

  it('sweeps stale online devices to offline and emits DeviceDisconnected', async () => {
    const { service, repository, events } = createService(1000);
    const device = await service.register('t1', 'Pixel 8');
    const heartbeatTime = new Date('2026-01-01T00:00:00.000Z');
    await service.heartbeat(device.id, heartbeatTime);

    const disconnected: Device[] = [];
    events.on('DeviceDisconnected', (d: Device) => {
      disconnected.push(d);
    });

    const later = new Date('2026-01-01T00:00:05.000Z');
    const swept = await service.sweepStaleDevices('t1', later);

    expect(swept).toHaveLength(1);
    expect(disconnected).toHaveLength(1);

    const stored = await repository.findById(device.id);
    expect(stored?.status).toBe('offline');
  });
});
