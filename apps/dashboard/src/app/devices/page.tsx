'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Device } from '@acp/types';
import { apiBaseUrl, loadSession } from '@/lib/session';
import { formatLastSeen, statusBadge } from '@/lib/device-status';

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }

    fetch(`${apiBaseUrl()}/devices`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load devices');
        }
        const body = (await response.json()) as { devices: Device[] };
        setDevices(body.devices);
      })
      .catch(() => {
        setError('Could not load devices');
      });
  }, [router]);

  return (
    <main>
      <h1 className="text-xl font-semibold">Devices</h1>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!error && devices === undefined ? (
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      ) : null}

      {devices && devices.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No devices registered yet.</p>
      ) : null}

      {devices && devices.length > 0 ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Status</th>
              <th className="py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const badge = statusBadge(device.status);
              return (
                <tr key={device.id} className="border-b border-slate-100">
                  <td className="py-2">{device.name}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{formatLastSeen(device.lastSeenAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
