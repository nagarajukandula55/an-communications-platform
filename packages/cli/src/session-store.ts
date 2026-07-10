import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CliSession {
  readonly baseUrl: string;
  readonly organizationId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface SessionStore {
  load(): CliSession | undefined;
  save(session: CliSession): void;
  clear(): void;
}

export function defaultSessionPath(): string {
  return join(homedir(), '.acp', 'session.json');
}

export class FileSessionStore implements SessionStore {
  constructor(private readonly path: string = defaultSessionPath()) {}

  load(): CliSession | undefined {
    try {
      const raw = readFileSync(this.path, 'utf8');
      return JSON.parse(raw) as CliSession;
    } catch {
      return undefined;
    }
  }

  save(session: CliSession): void {
    mkdirSync(join(this.path, '..'), { recursive: true });
    writeFileSync(this.path, JSON.stringify(session, null, 2), { mode: 0o600 });
  }

  clear(): void {
    rmSync(this.path, { force: true });
  }
}
