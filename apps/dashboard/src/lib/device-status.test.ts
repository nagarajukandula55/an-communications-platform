import { describe, expect, it } from 'vitest';
import { formatLastSeen, statusBadge } from './device-status.js';

describe('statusBadge', () => {
  it('labels online devices', () => {
    expect(statusBadge('online').label).toBe('Online');
  });

  it('labels offline devices', () => {
    expect(statusBadge('offline').label).toBe('Offline');
  });

  it('labels unknown devices', () => {
    expect(statusBadge('unknown').label).toBe('Unknown');
  });
});

describe('formatLastSeen', () => {
  it('returns Never when unset', () => {
    expect(formatLastSeen(undefined)).toBe('Never');
  });

  it('formats a timestamp', () => {
    expect(formatLastSeen(new Date(0).toISOString())).not.toBe('Never');
  });
});
