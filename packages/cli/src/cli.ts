import { AcpClient } from '@acp/sdk';
import { analyticsCommand } from './commands/analytics.js';
import { devicesCommand } from './commands/devices.js';
import { loginCommand } from './commands/login.js';
import { registerCommand } from './commands/register.js';
import type { SessionStore } from './session-store.js';

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

const DEFAULT_BASE_URL = 'http://localhost:3000';

export interface CliDeps {
  readonly store: SessionStore;
  readonly clientFactory?: (baseUrl: string) => AcpClient;
}

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<unknown> {
  const [command, ...args] = argv;
  const clientFactory = deps.clientFactory ?? ((baseUrl) => new AcpClient({ baseUrl }));

  switch (command) {
    case 'register': {
      const [organizationName, email, password, baseUrl] = args;
      if (!organizationName || !email || !password) {
        throw new UsageError('Usage: acp register <organizationName> <email> <password> [baseUrl]');
      }
      const url = baseUrl ?? DEFAULT_BASE_URL;
      return registerCommand(clientFactory(url), deps.store, url, organizationName, email, password);
    }

    case 'login': {
      const [organizationId, email, password, baseUrl] = args;
      if (!organizationId || !email || !password) {
        throw new UsageError('Usage: acp login <organizationId> <email> <password> [baseUrl]');
      }
      const url = baseUrl ?? DEFAULT_BASE_URL;
      return loginCommand(clientFactory(url), deps.store, url, organizationId, email, password);
    }

    case 'devices': {
      const session = deps.store.load();
      return devicesCommand(clientFactory(session?.baseUrl ?? DEFAULT_BASE_URL), session);
    }

    case 'analytics': {
      const session = deps.store.load();
      return analyticsCommand(clientFactory(session?.baseUrl ?? DEFAULT_BASE_URL), session);
    }

    case 'logout': {
      deps.store.clear();
      return { loggedOut: true };
    }

    default:
      throw new UsageError(
        `Unknown command: ${command ?? '(none)'}. Available: register, login, devices, analytics, logout`,
      );
  }
}
