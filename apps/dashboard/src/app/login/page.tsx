'use client';

import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';
import { apiBaseUrl, saveSession } from '@/lib/session';

interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: { readonly organizationId: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch(`${apiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId, email, password }),
      });

      if (!response.ok) {
        setError('Invalid credentials');
        return;
      }

      const session = (await response.json()) as LoginResponse;
      saveSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        organizationId: session.user.organizationId,
      });
      router.push('/devices');
    } catch {
      setError('Could not reach the API');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold">Sign in</h1>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">Organization ID</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 p-2"
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(event.target.value);
            }}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-slate-300 p-2"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-300 p-2"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 p-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
