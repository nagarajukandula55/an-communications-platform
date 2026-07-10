import type { AcpClient } from '@acp/sdk';
import type { Device } from '@acp/types';
import type { CliSession } from '../session-store.js';

export class NotLoggedInError extends Error {
  constructor() {
    super('Not logged in. Run `acp login` or `acp register` first.');
    this.name = 'NotLoggedInError';
  }
}

export function devicesCommand(
  client: AcpClient,
  session: CliSession | undefined,
): Promise<Device[]> {
  if (!session) {
    throw new NotLoggedInError();
  }
  return client.listDevices(session.accessToken);
}
