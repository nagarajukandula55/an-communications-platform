'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiBaseUrl, saveSession } from '@/lib/session';

interface SsoSessionResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: { readonly organizationId: string };
}

function SsoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const ssoToken = searchParams.get('token');
    if (!ssoToken) {
      setError('No SSO token was provided. Open this app from the AN Group portal.');
      return;
    }

    fetch(`${apiBaseUrl()}/auth/sso/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ssoToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('SSO sign-in failed');
        }
        const session = (await response.json()) as SsoSessionResponse;
        saveSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          organizationId: session.user.organizationId,
        });
        router.push('/devices');
      })
      .catch(() => {
        setError('SSO sign-in failed. Your ANgroup session may have expired - try launching this app again.');
      });
  }, [searchParams, router]);

  return (
    <main className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold">Signing you in...</h1>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </main>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-sm">
          <h1 className="text-xl font-semibold">Signing you in...</h1>
        </main>
      }
    >
      <SsoCallback />
    </Suspense>
  );
}
