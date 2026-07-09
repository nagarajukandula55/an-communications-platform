import type { Device } from '@acp/types';

export interface StatusBadge {
  readonly label: string;
  readonly className: string;
}

export function statusBadge(status: Device['status']): StatusBadge {
  switch (status) {
    case 'online':
      return { label: 'Online', className: 'bg-green-100 text-green-800' };
    case 'offline':
      return { label: 'Offline', className: 'bg-slate-200 text-slate-700' };
    case 'unknown':
      return { label: 'Unknown', className: 'bg-amber-100 text-amber-800' };
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled device status: ${String(exhaustive)}`);
    }
  }
}

export function formatLastSeen(lastSeenAt: string | undefined): string {
  if (!lastSeenAt) {
    return 'Never';
  }
  return new Date(lastSeenAt).toLocaleString();
}
