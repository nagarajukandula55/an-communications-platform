'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  INTEGRATION_FIELD_SPECS,
  type IntegrationProvider,
} from '@acp/integrations/types';
import { apiBaseUrl, loadSession } from '@/lib/session';

const PROVIDERS = Object.keys(INTEGRATION_FIELD_SPECS) as IntegrationProvider[];

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  smtp: 'Email (SMTP)',
  fcm: 'Push — Firebase (Android)',
  apns: 'Push — Apple (iOS)',
  whatsapp: 'WhatsApp Business API',
  voice: 'Voice Provider',
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>('smtp');
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setAccessToken(session.accessToken);
  }, [router]);

  if (!accessToken) {
    return (
      <main>
        <h1 className="text-xl font-semibold">Integration Settings</h1>
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-xl font-semibold">Integration Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Configure the provider credentials each channel needs. Values shown as
        dots are already set and stored encrypted — leave them alone unless
        you want to replace them.
      </p>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {PROVIDERS.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => {
              setActiveProvider(provider);
            }}
            className={`rounded-t px-3 py-2 text-sm ${
              activeProvider === provider
                ? 'border-b-2 border-slate-900 font-medium'
                : 'text-slate-500'
            }`}
          >
            {PROVIDER_LABELS[provider]}
          </button>
        ))}
      </div>

      <IntegrationForm
        key={activeProvider}
        provider={activeProvider}
        accessToken={accessToken}
      />
    </main>
  );
}

function IntegrationForm({
  provider,
  accessToken,
}: {
  provider: IntegrationProvider;
  accessToken: string;
}) {
  const specs = INTEGRATION_FIELD_SPECS[provider];
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>(
    'loading',
  );

  useEffect(() => {
    setStatus('loading');
    fetch(`${apiBaseUrl()}/integrations/${provider}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load');
        }
        const body = (await response.json()) as { config: Record<string, string> };
        setValues(body.config);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [provider, accessToken]);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    try {
      const response = await fetch(`${apiBaseUrl()}/integrations/${provider}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });
      setStatus(response.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 max-w-md space-y-4">
      {specs.map((spec) => (
        <label key={spec.key} className="block">
          <span className="text-sm text-slate-600">{spec.label}</span>
          <input
            type={spec.secret ? 'password' : 'text'}
            className="mt-1 w-full rounded border border-slate-300 p-2"
            placeholder={spec.placeholder}
            value={values[spec.key] ?? ''}
            onChange={(event) => {
              setValues((current) => ({ ...current, [spec.key]: event.target.value }));
            }}
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={status === 'saving' || status === 'loading'}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving...' : 'Save'}
      </button>

      {status === 'saved' ? <p className="text-sm text-green-700">Saved.</p> : null}
      {status === 'error' ? (
        <p className="text-sm text-red-600">Something went wrong.</p>
      ) : null}
    </form>
  );
}
