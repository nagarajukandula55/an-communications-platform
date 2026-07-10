import { PostgresAnalyticsRepository } from '@acp/analytics';
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
import {
  INTEGRATIONS_SCHEMA_SQL,
  IntegrationsService,
  PostgresIntegrationRepository,
} from '@acp/integrations';
import { EmailTransport } from '@acp/email-transport';
import { PushTransport } from '@acp/push-transport';
import { WhatsAppTransport } from '@acp/whatsapp-transport';
import { VoiceTransport } from '@acp/voice-transport';
import {
  WEBHOOKS_SCHEMA_SQL,
  WebhookDispatcher,
  PostgresWebhookRepository,
} from '@acp/webhooks';
import { SsoClient } from '@acp/sso-client';
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
  await db.query(INTEGRATIONS_SCHEMA_SQL);
  await db.query(WEBHOOKS_SCHEMA_SQL);

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

  const analytics = new PostgresAnalyticsRepository(db);

  const integrations = new IntegrationsService(
    new PostgresIntegrationRepository(db),
    {
      encryptionSecret:
        process.env['INTEGRATIONS_ENCRYPTION_SECRET'] ?? 'dev-encryption-secret',
    },
  );

  const webhooks = new PostgresWebhookRepository(db);
  new WebhookDispatcher({ repository: webhooks, events });

  // Every login goes through ANgroup SSO except accounts ANgroup itself
  // flags isSuperAdmin - see AuthService.login/ssoLogin. Unset in
  // environments not part of the ANgroup ecosystem (e.g. local dev).
  const ssoBaseUrl = process.env['ANGROUP_SSO_URL'];
  const sso = ssoBaseUrl ? new SsoClient({ baseUrl: ssoBaseUrl }) : undefined;

  const { app, smsDispatcher } = await buildApp({
    auth,
    tokens,
    devices,
    deviceTokens,
    analytics,
    integrations,
    webhooks,
    ...(sso ? { sso } : {}),
  });

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

  router.register(
    new EmailTransport({
      configProvider: {
        getConfig: async (tenantId) => {
          const config = await integrations.getConfig(tenantId, 'smtp');
          if (!config?.['host'] || !config['fromAddress']) {
            return undefined;
          }
          return {
            host: config['host'],
            port: Number(config['port'] ?? '587'),
            fromAddress: config['fromAddress'],
            ...(config['username'] ? { username: config['username'] } : {}),
            ...(config['password'] ? { password: config['password'] } : {}),
          };
        },
      },
    }),
  );

  router.register(
    new PushTransport({
      configProvider: {
        getFcmConfig: async (tenantId) => {
          const config = await integrations.getConfig(tenantId, 'fcm');
          if (!config?.['projectId'] || !config['clientEmail'] || !config['privateKey']) {
            return undefined;
          }
          return {
            projectId: config['projectId'],
            clientEmail: config['clientEmail'],
            privateKey: config['privateKey'],
          };
        },
        getApnsConfig: async (tenantId) => {
          const config = await integrations.getConfig(tenantId, 'apns');
          if (
            !config?.['teamId'] ||
            !config['keyId'] ||
            !config['bundleId'] ||
            !config['privateKey']
          ) {
            return undefined;
          }
          return {
            teamId: config['teamId'],
            keyId: config['keyId'],
            bundleId: config['bundleId'],
            privateKey: config['privateKey'],
          };
        },
      },
    }),
  );

  router.register(
    new WhatsAppTransport({
      configProvider: {
        getConfig: async (tenantId) => {
          const config = await integrations.getConfig(tenantId, 'whatsapp');
          if (!config?.['phoneNumberId'] || !config['accessToken']) {
            return undefined;
          }
          return {
            phoneNumberId: config['phoneNumberId'],
            accessToken: config['accessToken'],
          };
        },
      },
    }),
  );

  router.register(
    new VoiceTransport({
      configProvider: {
        getConfig: async (tenantId) => {
          const config = await integrations.getConfig(tenantId, 'voice');
          if (
            !config?.['apiBaseUrl'] ||
            !config['accountId'] ||
            !config['apiKey'] ||
            !config['callerNumber']
          ) {
            return undefined;
          }
          return {
            apiBaseUrl: config['apiBaseUrl'],
            accountId: config['accountId'],
            apiKey: config['apiKey'],
            callerNumber: config['callerNumber'],
          };
        },
      },
    }),
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

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('Shutting down', { signal });

    void Promise.allSettled([app.close(), messageQueue.close(), db.close()]).then(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
