'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiBaseUrl, loadSession } from '@/lib/session';

interface DeliveryStats {
  readonly total: number;
  readonly byStatus: Record<string, number>;
  readonly byChannel: Record<string, number>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DeliveryStats | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }

    fetch(`${apiBaseUrl()}/analytics`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load analytics');
        }
        setStats((await response.json()) as DeliveryStats);
      })
      .catch(() => {
        setError('Could not load analytics');
      });
  }, [router]);

  return (
    <main>
      <h1 className="text-xl font-semibold">Analytics</h1>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!error && !stats ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : null}

      {stats ? (
        <div className="mt-4 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total messages</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>

          <section>
            <h2 className="text-sm font-medium text-slate-600">By status</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span className="capitalize">{status}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-medium text-slate-600">By channel</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(stats.byChannel).map(([channel, count]) => (
                <li key={channel} className="flex justify-between">
                  <span className="uppercase">{channel}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
