import { describe, expect, it } from 'vitest';
import { AcpClient } from '@acp/sdk';
import { runCli, UsageError } from './cli.js';
import type { CliSession, SessionStore } from './session-store.js';

class FakeSessionStore implements SessionStore {
  private session: CliSession | undefined;

  load(): CliSession | undefined {
    return this.session;
  }

  save(session: CliSession): void {
    this.session = session;
  }

  clear(): void {
    this.session = undefined;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('runCli', () => {
  it('registers and saves the session', async () => {
    const store = new FakeSessionStore();
    const fetchFn: typeof fetch = () =>
      Promise.resolve(
        jsonResponse({
          user: { id: 'u1', organizationId: 'org-1', email: 'a@b.com', role: 'owner' },
          accessToken: 'access',
          refreshToken: 'refresh',
        }),
      );

    const result = await runCli(['register', 'Acme', 'a@b.com', 'password123'], {
      store,
      clientFactory: (baseUrl) => new AcpClient({ baseUrl, fetchFn }),
    });

    expect(result).toEqual({ organizationId: 'org-1', userId: 'u1' });
    expect(store.load()?.accessToken).toBe('access');
  });

  it('lists devices using the stored session', async () => {
    const store = new FakeSessionStore();
    store.save({
      baseUrl: 'https://api.example.com',
      organizationId: 'org-1',
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const fetchFn: typeof fetch = () => Promise.resolve(jsonResponse({ devices: [] }));

    const result = await runCli(['devices'], {
      store,
      clientFactory: (baseUrl) => new AcpClient({ baseUrl, fetchFn }),
    });

    expect(result).toEqual([]);
  });

  it('throws NotLoggedInError-derived failure when devices is run without a session', async () => {
    const store = new FakeSessionStore();
    await expect(runCli(['devices'], { store })).rejects.toThrow(
      'Not logged in',
    );
  });

  it('throws UsageError for an unknown command', async () => {
    const store = new FakeSessionStore();
    await expect(runCli(['bogus'], { store })).rejects.toBeInstanceOf(UsageError);
  });

  it('throws UsageError when required register arguments are missing', async () => {
    const store = new FakeSessionStore();
    await expect(runCli(['register', 'Acme'], { store })).rejects.toBeInstanceOf(
      UsageError,
    );
  });

  it('clears the session on logout', async () => {
    const store = new FakeSessionStore();
    store.save({
      baseUrl: 'https://api.example.com',
      organizationId: 'org-1',
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await runCli(['logout'], { store });

    expect(result).toEqual({ loggedOut: true });
    expect(store.load()).toBeUndefined();
  });
});
