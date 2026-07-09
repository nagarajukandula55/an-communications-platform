import type { Device } from '@acp/types';

export interface DeviceSelector {
  select(devices: readonly Device[]): Device | undefined;
}

/**
 * Round-robins across online devices for a tenant so load spreads evenly,
 * and so a failed device naturally rotates out of the front of the queue
 * on the next send (paired with CompositeSmsTransport's per-attempt retry
 * across devices for actual failover).
 */
export class RoundRobinDeviceSelector implements DeviceSelector {
  private readonly cursors = new Map<string, number>();

  select(devices: readonly Device[]): Device | undefined {
    const online = devices.filter((device) => device.status === 'online');
    if (online.length === 0) {
      return undefined;
    }

    const tenantId = online[0]?.tenantId ?? '';
    const cursor = this.cursors.get(tenantId) ?? 0;
    const index = cursor % online.length;
    this.cursors.set(tenantId, cursor + 1);

    return online[index];
  }
}
