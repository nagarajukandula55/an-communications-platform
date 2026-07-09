import type { Device, DeviceStatus } from '@acp/types';
import type { DeviceRepository } from './repositories.js';

export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly devices = new Map<string, Device>();

  create(device: Device): Promise<Device> {
    this.devices.set(device.id, device);
    return Promise.resolve(device);
  }

  findById(id: string): Promise<Device | undefined> {
    return Promise.resolve(this.devices.get(id));
  }

  listByTenant(tenantId: string): Promise<Device[]> {
    return Promise.resolve(
      [...this.devices.values()].filter(
        (device) => device.tenantId === tenantId,
      ),
    );
  }

  updateHeartbeat(
    id: string,
    status: DeviceStatus,
    lastSeenAt: string,
  ): Promise<void> {
    const existing = this.devices.get(id);
    if (existing) {
      this.devices.set(id, { ...existing, status, lastSeenAt });
    }
    return Promise.resolve();
  }
}
