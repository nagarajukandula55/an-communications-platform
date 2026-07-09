'use client';

export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly organizationId: string;
}

const STORAGE_KEY = 'acp.dashboard.session';

export function saveSession(session: StoredSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): StoredSession | undefined {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return undefined;
  }
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function apiBaseUrl(): string {
  return process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3000';
}
