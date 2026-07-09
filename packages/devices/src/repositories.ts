import type { Device, DeviceStatus } from '@acp/types';

export interface DeviceRepository {
  create(device: Device): Promise<Device>;
  findById(id: string): Promise<Device | undefined>;
  listByTenant(tenantId: string): Promise<Device[]>;
  updateHeartbeat(
    id: string,
    status: DeviceStatus,
    lastSeenAt: string,
  ): Promise<void>;
}
