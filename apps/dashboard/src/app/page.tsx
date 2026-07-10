import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/devices', label: 'Devices', description: 'Live device status and heartbeat monitoring.' },
  {
    href: '/queue',
    label: 'Queue',
    description: 'Coming soon — needs a queue-stats endpoint on the API.',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Message delivery totals by status and channel.',
  },
  {
    href: '/logs',
    label: 'Live Logs',
    description: 'Coming soon — needs a log-streaming endpoint on the API.',
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <h1 className="text-2xl font-semibold">AN Communications Platform</h1>
      <p className="mt-1 text-slate-600">Operator Dashboard</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400"
          >
            <h2 className="font-medium">{item.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Not logged in yet? <Link href="/login" className="underline">Sign in</Link>.
      </p>
    </main>
  );
}
