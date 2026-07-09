import { describe, expect, it } from 'vitest';
import type { Device } from '@acp/types';
import { RoundRobinDeviceSelector } from './device-selector.js';

function device(id: string, status: Device['status'] = 'online'): Device {
  return { id, tenantId: 't1', name: id, status };
}

describe('RoundRobinDeviceSelector', () => {
  it('returns undefined when no devices are online', () => {
    const selector = new RoundRobinDeviceSelector();
    expect(selector.select([device('a', 'offline')])).toBeUndefined();
  });

  it('rotates across online devices on successive calls', () => {
    const selector = new RoundRobinDeviceSelector();
    const devices = [device('a'), device('b'), device('c')];

    expect(selector.select(devices)?.id).toBe('a');
    expect(selector.select(devices)?.id).toBe('b');
    expect(selector.select(devices)?.id).toBe('c');
    expect(selector.select(devices)?.id).toBe('a');
  });

  it('skips offline devices', () => {
    const selector = new RoundRobinDeviceSelector();
    const devices = [device('a', 'offline'), device('b'), device('c', 'offline')];

    expect(selector.select(devices)?.id).toBe('b');
    expect(selector.select(devices)?.id).toBe('b');
  });
});
