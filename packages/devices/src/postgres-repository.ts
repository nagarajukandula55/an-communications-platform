import type { Database } from '@acp/database';
import type { Device, DeviceStatus } from '@acp/types';
import type { DeviceRepository } from './repositories.js';

interface DeviceRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly status: DeviceStatus;
  readonly last_seen_at: string | null;
}

function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    status: row.status,
    ...(row.last_seen_at !== null ? { lastSeenAt: row.last_seen_at } : {}),
  };
}

export class PostgresDeviceRepository implements DeviceRepository {
  constructor(private readonly db: Database) {}

  async create(device: Device): Promise<Device> {
    await this.db.query(
      `INSERT INTO devices (id, tenant_id, name, status, last_seen_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        device.id,
        device.tenantId,
        device.name,
        device.status,
        device.lastSeenAt ?? null,
      ],
    );
    return device;
  }

  async findById(id: string): Promise<Device | undefined> {
    const result = await this.db.query<DeviceRow>(
      'SELECT * FROM devices WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toDevice(result.rows[0]) : undefined;
  }

  async listByTenant(tenantId: string): Promise<Device[]> {
    const result = await this.db.query<DeviceRow>(
      'SELECT * FROM devices WHERE tenant_id = $1 ORDER BY name',
      [tenantId],
    );
    return result.rows.map(toDevice);
  }

  async updateHeartbeat(
    id: string,
    status: DeviceStatus,
    lastSeenAt: string,
  ): Promise<void> {
    await this.db.query(
      'UPDATE devices SET status = $2, last_seen_at = $3 WHERE id = $1',
      [id, status, lastSeenAt],
    );
  }
}
