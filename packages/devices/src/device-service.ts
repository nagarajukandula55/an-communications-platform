import { generateId } from '@acp/shared';
import type { EventBus } from '@acp/events';
import type { Device } from '@acp/types';
import type { DeviceRepository } from './repositories.js';

export interface DeviceServiceOptions {
  readonly offlineThresholdMs?: number;
}

const DEFAULT_OFFLINE_THRESHOLD_MS = 90_000;

export class DeviceNotFoundError extends Error {
  constructor(id: string) {
    super(`Device not found: ${id}`);
    this.name = 'DeviceNotFoundError';
  }
}

export class DeviceService {
  private readonly offlineThresholdMs: number;

  constructor(
    private readonly repository: DeviceRepository,
    private readonly events: EventBus,
    options: DeviceServiceOptions = {},
  ) {
    this.offlineThresholdMs =
      options.offlineThresholdMs ?? DEFAULT_OFFLINE_THRESHOLD_MS;
  }

  list(tenantId: string): Promise<Device[]> {
    return this.repository.listByTenant(tenantId);
  }

  async register(tenantId: string, name: string): Promise<Device> {
    const device: Device = {
      id: generateId(),
      tenantId,
      name,
      status: 'offline',
    };
    await this.repository.create(device);
    return device;
  }

  async heartbeat(deviceId: string, now: Date = new Date()): Promise<Device> {
    const existing = await this.repository.findById(deviceId);
    if (!existing) {
      throw new DeviceNotFoundError(deviceId);
    }

    const wasOffline = existing.status !== 'online';
    const lastSeenAt = now.toISOString();
    await this.repository.updateHeartbeat(deviceId, 'online', lastSeenAt);

    const updated: Device = { ...existing, status: 'online', lastSeenAt };
    if (wasOffline) {
      this.events.emit('DeviceConnected', updated);
    }

    return updated;
  }

  isStale(device: Device, now: Date = new Date()): boolean {
    if (!device.lastSeenAt) {
      return true;
    }
    return now.getTime() - new Date(device.lastSeenAt).getTime() > this.offlineThresholdMs;
  }

  async sweepStaleDevices(
    tenantId: string,
    now: Date = new Date(),
  ): Promise<Device[]> {
    const devices = await this.repository.listByTenant(tenantId);
    const wentOffline: Device[] = [];

    for (const device of devices) {
      if (device.status === 'online' && this.isStale(device, now)) {
        await this.repository.updateHeartbeat(
          device.id,
          'offline',
          device.lastSeenAt ?? now.toISOString(),
        );
        const updated: Device = { ...device, status: 'offline' };
        this.events.emit('DeviceDisconnected', updated);
        wentOffline.push(updated);
      }
    }

    return wentOffline;
  }
}
