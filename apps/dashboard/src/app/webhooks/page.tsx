'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WEBHOOK_EVENT_NAMES, type WebhookEventName } from '@acp/webhooks/types';
import { apiBaseUrl, loadSession } from '@/lib/session';

interface WebhookSummary {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly createdAt: string;
}

export default function WebhooksPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [webhooks, setWebhooks] = useState<readonly WebhookSummary[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<readonly WebhookEventName[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setAccessToken(session.accessToken);
  }, [router]);

  function loadWebhooks(token: string) {
    setStatus('loading');
    fetch(`${apiBaseUrl()}/webhooks`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load');
        }
        const body = (await response.json()) as { webhooks: readonly WebhookSummary[] };
        setWebhooks(body.webhooks);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
      });
  }

  useEffect(() => {
    if (accessToken) {
      loadWebhooks(accessToken);
    }
  }, [accessToken]);

  function toggleEvent(eventName: WebhookEventName) {
    setSelectedEvents((current) =>
      current.includes(eventName)
        ? current.filter((name) => name !== eventName)
        : [...current, eventName],
    );
  }

  async function handleCreate(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || selectedEvents.length === 0) {
      return;
    }
    const response = await fetch(`${apiBaseUrl()}/webhooks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url, events: selectedEvents }),
    });
    if (response.ok) {
      const body = (await response.json()) as { secret: string };
      setCreatedSecret(body.secret);
      setUrl('');
      setSelectedEvents([]);
      loadWebhooks(accessToken);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) {
      return;
    }
    await fetch(`${apiBaseUrl()}/webhooks/${id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    loadWebhooks(accessToken);
  }

  if (!accessToken) {
    return (
      <main>
        <h1 className="text-xl font-semibold">Webhooks</h1>
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-xl font-semibold">Webhooks</h1>
      <p className="mt-1 text-sm text-slate-500">
        Subscribe an HTTPS endpoint to receive signed (HMAC-SHA256) event
        payloads as they happen.
      </p>

      <section className="mt-6 max-w-md space-y-3">
        {status === 'loading' ? <p className="text-sm text-slate-500">Loading...</p> : null}
        {status === 'error' ? (
          <p className="text-sm text-red-600">Failed to load webhooks.</p>
        ) : null}
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="rounded border border-slate-200 bg-white p-3">
            <p className="break-all text-sm font-medium">{webhook.url}</p>
            <p className="mt-1 text-xs text-slate-500">{webhook.events.join(', ')}</p>
            <button
              type="button"
              onClick={() => void handleDelete(webhook.id)}
              className="mt-2 text-xs text-red-600 underline"
            >
              Delete
            </button>
          </div>
        ))}
        {status === 'idle' && webhooks.length === 0 ? (
          <p className="text-sm text-slate-500">No webhooks configured yet.</p>
        ) : null}
      </section>

      <form onSubmit={(event) => void handleCreate(event)} className="mt-8 max-w-md space-y-4">
        <h2 className="font-medium">Add webhook</h2>
        <label className="block">
          <span className="text-sm text-slate-600">Endpoint URL</span>
          <input
            type="url"
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
            placeholder="https://example.com/webhooks/acp"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
          />
        </label>

        <fieldset>
          <legend className="text-sm text-slate-600">Events</legend>
          <div className="mt-1 space-y-1">
            {WEBHOOK_EVENT_NAMES.map((eventName) => (
              <label key={eventName} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(eventName)}
                  onChange={() => {
                    toggleEvent(eventName);
                  }}
                />
                {eventName}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={selectedEvents.length === 0 || url.length === 0}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Add webhook
        </button>
      </form>

      {createdSecret ? (
        <p className="mt-4 max-w-md rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Signing secret (shown once, save it now):{' '}
          <code className="break-all">{createdSecret}</code>
        </p>
      ) : null}
    </main>
  );
}
