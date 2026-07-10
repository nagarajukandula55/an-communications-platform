import type { AcpClient } from '@acp/sdk';
import type { SessionStore } from '../session-store.js';

export async function registerCommand(
  client: AcpClient,
  store: SessionStore,
  baseUrl: string,
  organizationName: string,
  email: string,
  password: string,
): Promise<{ organizationId: string; userId: string }> {
  const session = await client.register(organizationName, email, password);
  store.save({
    baseUrl,
    organizationId: session.user.organizationId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  return { organizationId: session.user.organizationId, userId: session.user.id };
}
