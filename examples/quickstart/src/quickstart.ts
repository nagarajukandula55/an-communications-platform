/**
 * Runnable quickstart: register an organization against a running
 * apps/api instance, then list devices and analytics.
 *
 *   pnpm --filter @acp/example-quickstart start
 *
 * Requires apps/api reachable at API_BASE_URL (defaults to
 * http://localhost:3000). Each run registers a fresh organization since
 * /auth/register always creates a new one.
 */
import { AcpClient } from '@acp/sdk';

async function main(): Promise<void> {
  const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  const client = new AcpClient({ baseUrl });

  const email = `owner+${Date.now().toString()}@example.com`;
  const session = await client.register('Quickstart Org', email, 'correct-horse-battery-staple');

  console.error(`Registered organization ${session.user.organizationId}`);
  console.error(`Access token: ${session.accessToken.slice(0, 16)}...`);

  const devices = await client.listDevices(session.accessToken);
  console.error(`Devices: ${String(devices.length)}`);

  const stats = await client.getAnalytics(session.accessToken);
  console.error(`Messages sent so far: ${String(stats.total)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
