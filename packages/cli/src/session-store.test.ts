import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileSessionStore } from './session-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'acp-cli-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('FileSessionStore', () => {
  it('returns undefined when no session file exists', () => {
    const store = new FileSessionStore(join(dir, 'nested', 'session.json'));
    expect(store.load()).toBeUndefined();
  });

  it('saves and loads a session, creating parent directories', () => {
    const store = new FileSessionStore(join(dir, 'nested', 'session.json'));
    const session = {
      baseUrl: 'https://api.example.com',
      organizationId: 'org-1',
      accessToken: 'access',
      refreshToken: 'refresh',
    };

    store.save(session);
    expect(store.load()).toEqual(session);
  });

  it('clears the session file', () => {
    const store = new FileSessionStore(join(dir, 'session.json'));
    store.save({
      baseUrl: 'https://api.example.com',
      organizationId: 'org-1',
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    store.clear();
    expect(store.load()).toBeUndefined();
  });
});
