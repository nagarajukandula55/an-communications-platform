import type { AcpClient, DeliveryStats } from '@acp/sdk';
import type { CliSession } from '../session-store.js';
import { NotLoggedInError } from './devices.js';

export function analyticsCommand(
  client: AcpClient,
  session: CliSession | undefined,
): Promise<DeliveryStats> {
  if (!session) {
    throw new NotLoggedInError();
  }
  return client.getAnalytics(session.accessToken);
}
