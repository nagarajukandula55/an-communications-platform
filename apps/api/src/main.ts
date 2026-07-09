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
import {
  BullMqMessageQueue,
  MESSAGING_SCHEMA_SQL,
  MessageRouter,
  MessageService,
  PostgresMessageRepository,
  type QueuedMessagePayload,
} from '@acp/messaging';
import {
  AndroidGatewayTransport,
  RoundRobinDeviceSelector,
  type DeviceDirectory,
} from '@acp/sms-transport';
import { buildApp } from './build-app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ name: 'api', level: 'info' });

  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to start the API service');
  }
  if (!config.REDIS_URL) {
    throw new Error('REDIS_URL is required to start the API service');
  }

  const db = new Database({ connectionString: config.DATABASE_URL });
  await db.query(AUTH_SCHEMA_SQL);
  await db.query(DEVICES_SCHEMA_SQL);
  await db.query(MESSAGING_SCHEMA_SQL);

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
  const deviceRepository = new PostgresDeviceRepository(db);
  const devices = new DeviceService(deviceRepository, events);

  const { app, smsDispatcher } = await buildApp({ auth, tokens, devices, deviceTokens });

  const deviceDirectory: DeviceDirectory = {
    listOnlineByTenant: async (tenantId) => {
      const all = await deviceRepository.listByTenant(tenantId);
      return all.filter((device) => device.status === 'online');
    },
  };

  const router = new MessageRouter();
  router.register(
    new AndroidGatewayTransport(
      deviceDirectory,
      smsDispatcher,
      new RoundRobinDeviceSelector(),
    ),
  );

  const redisUrl = new URL(config.REDIS_URL);
  const messageQueue = new BullMqMessageQueue<QueuedMessagePayload>({
    queueName: `${config.APP_NAME.toLowerCase().replace(/\s+/g, '-')}-messages`,
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || '6379'),
      ...(redisUrl.password ? { password: redisUrl.password } : {}),
    },
  });

  const messages = new MessageService({
    repository: new PostgresMessageRepository(db),
    queue: messageQueue,
    events,
  });
  void messages; // wired for future HTTP endpoints (e.g. POST /messages), not yet exposed

  void router; // consumed by the worker process (createMessageProcessor), not this HTTP server

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  logger.info('API listening', { host: config.API_HOST, port: config.API_PORT });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
