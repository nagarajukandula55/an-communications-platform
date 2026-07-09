import { Database } from '@acp/database';
import { loadConfig } from '@acp/config';
import { EventBus } from '@acp/events';
import { createLogger } from '@acp/logger';
import {
  AUTH_SCHEMA_SQL,
  AuthService,
  PostgresApiKeyRepository,
  PostgresOrganizationRepository,
  PostgresRefreshTokenRepository,
  PostgresUserRepository,
  PostgresDeviceTokenRepository,
  TokenService,
} from '@acp/auth';
import {
  DEVICES_SCHEMA_SQL,
  DeviceService,
  PostgresDeviceRepository,
} from '@acp/devices';
import { buildApp } from './build-app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ name: 'api', level: 'info' });

  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to start the API service');
  }

  const db = new Database({ connectionString: config.DATABASE_URL });
  await db.query(AUTH_SCHEMA_SQL);
  await db.query(DEVICES_SCHEMA_SQL);

  const events = new EventBus();

  const tokens = new TokenService({
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES'] ?? '30d',
  });

  const auth = new AuthService({
    users: new PostgresUserRepository(db),
    organizations: new PostgresOrganizationRepository(db),
    apiKeys: new PostgresApiKeyRepository(db),
    refreshTokens: new PostgresRefreshTokenRepository(db),
    tokens,
  });

  const deviceTokens = new PostgresDeviceTokenRepository(db);
  const devices = new DeviceService(new PostgresDeviceRepository(db), events);

  const app = await buildApp({ auth, devices, deviceTokens });

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  logger.info('API listening', { host: config.API_HOST, port: config.API_PORT });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
