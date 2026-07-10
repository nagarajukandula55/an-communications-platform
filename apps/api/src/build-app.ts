import helmetPlugin from '@fastify/helmet';
import rateLimitPlugin from '@fastify/rate-limit';
import websocketPlugin from '@fastify/websocket';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import {
  EmailInUseError,
  InvalidCredentialsError,
  type AccessTokenClaims,
  type AuthService,
  type DeviceTokenRepository,
  type TokenService,
} from '@acp/auth';
import type { AnalyticsRepository } from '@acp/analytics';
import type { DeviceService } from '@acp/devices';
import {
  INTEGRATION_FIELD_SPECS,
  type IntegrationProvider,
  type IntegrationsService,
} from '@acp/integrations';
import {
  WEBHOOK_EVENT_NAMES,
  type WebhookEventName,
  type WebhookRepository,
} from '@acp/webhooks';
import { generateId } from '@acp/shared';
import { ConnectionRegistry } from './connection-registry.js';
import {
  handleGatewayMessage,
  type GatewayConnectionState,
} from './gateway.js';
import { WsDeviceCommandDispatcher } from './ws-device-command-dispatcher.js';
import { createMetrics } from './metrics.js';

export interface AppDeps {
  readonly auth: AuthService;
  readonly tokens: TokenService;
  readonly devices: DeviceService;
  readonly deviceTokens: DeviceTokenRepository;
  readonly analytics: AnalyticsRepository;
  readonly integrations: IntegrationsService;
  readonly webhooks: WebhookRepository;
}

const VALID_WEBHOOK_EVENTS = new Set<string>(WEBHOOK_EVENT_NAMES);

function isWebhookEventName(value: string): value is WebhookEventName {
  return VALID_WEBHOOK_EVENTS.has(value);
}

const VALID_PROVIDERS = new Set(Object.keys(INTEGRATION_FIELD_SPECS));

function isIntegrationProvider(value: string): value is IntegrationProvider {
  return VALID_PROVIDERS.has(value);
}

export interface BuiltApp {
  readonly app: FastifyInstance;
  readonly connections: ConnectionRegistry;
  readonly smsDispatcher: WsDeviceCommandDispatcher;
}

interface RegisterBody {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
}

interface LoginBody {
  readonly organizationId: string;
  readonly email: string;
  readonly password: string;
}

interface RefreshBody {
  readonly refreshToken: string;
}

export interface BuildAppOptions {
  /** Disabled in tests to avoid 429s across many requests in one run. */
  readonly rateLimit?: boolean;
}

const AUTH_BODY_STRING = { type: 'string', minLength: 1, maxLength: 320 } as const;

export async function buildApp(
  deps: AppDeps,
  options: BuildAppOptions = {},
): Promise<BuiltApp> {
  const app = Fastify({ logger: false });
  await app.register(websocketPlugin);
  await app.register(helmetPlugin);

  if (options.rateLimit !== false) {
    await app.register(rateLimitPlugin, { max: 100, timeWindow: '1 minute' });
  }

  const connections = new ConnectionRegistry();
  const smsDispatcher = new WsDeviceCommandDispatcher({ registry: connections });
  const metrics = createMetrics();

  app.addHook('onResponse', (request, reply, done) => {
    const labels = {
      method: request.method,
      route: request.routeOptions.url ?? request.url,
      status_code: String(reply.statusCode),
    };
    metrics.httpRequestsTotal.inc(labels);
    metrics.httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
    done();
  });

  app.get('/health', () => ({ status: 'ok' }));

  app.get('/metrics', async (_request, reply) => {
    await reply.type(metrics.registry.contentType).send(await metrics.registry.metrics());
  });

  const authRateLimitConfig =
    options.rateLimit !== false
      ? { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }
      : {};

  app.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      ...authRateLimitConfig,
      schema: {
        body: {
          type: 'object',
          required: ['organizationName', 'email', 'password'],
          properties: {
            organizationName: AUTH_BODY_STRING,
            email: AUTH_BODY_STRING,
            password: { type: 'string', minLength: 8, maxLength: 256 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const session = await deps.auth.register(request.body);
        await reply.code(201).send(session);
      } catch (error) {
        if (error instanceof EmailInUseError) {
          await reply.code(409).send({ message: error.message });
          return;
        }
        throw error;
      }
    },
  );

  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      ...authRateLimitConfig,
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'email', 'password'],
          properties: {
            organizationId: AUTH_BODY_STRING,
            email: AUTH_BODY_STRING,
            password: { type: 'string', minLength: 1, maxLength: 256 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const session = await deps.auth.login(request.body);
        await reply.send(session);
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          await reply.code(401).send({ message: error.message });
          return;
        }
        throw error;
      }
    },
  );

  app.post<{ Body: RefreshBody }>(
    '/auth/refresh',
    {
      ...authRateLimitConfig,
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: AUTH_BODY_STRING },
        },
      },
    },
    async (request, reply) => {
      try {
        const session = await deps.auth.refresh(request.body.refreshToken);
        await reply.send(session);
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          await reply.code(401).send({ message: error.message });
          return;
        }
        throw error;
      }
    },
  );

  function requireAuth(request: FastifyRequest): AccessTokenClaims {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new InvalidCredentialsError();
    }
    return deps.tokens.verifyAccessToken(header.slice('Bearer '.length));
  }

  app.get('/devices', async (request, reply) => {
    try {
      const claims = requireAuth(request);
      const devices = await deps.devices.list(claims.organizationId);
      await reply.send({ devices });
    } catch {
      await reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.get('/analytics', async (request, reply) => {
    try {
      const claims = requireAuth(request);
      const stats = await deps.analytics.getDeliveryStats(claims.organizationId);
      await reply.send(stats);
    } catch {
      await reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.get<{ Params: { provider: string } }>(
    '/integrations/:provider',
    async (request, reply) => {
      try {
        const claims = requireAuth(request);
        const { provider } = request.params;
        if (!isIntegrationProvider(provider)) {
          await reply.code(404).send({ message: 'Unknown provider' });
          return;
        }
        const config = await deps.integrations.getMaskedConfig(
          claims.organizationId,
          provider,
        );
        await reply.send({ provider, config: config ?? {} });
      } catch {
        await reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  );

  app.put<{ Params: { provider: string }; Body: Record<string, string> }>(
    '/integrations/:provider',
    async (request, reply) => {
      try {
        const claims = requireAuth(request);
        const { provider } = request.params;
        if (!isIntegrationProvider(provider)) {
          await reply.code(404).send({ message: 'Unknown provider' });
          return;
        }
        await deps.integrations.save(claims.organizationId, provider, request.body);
        await reply.code(204).send();
      } catch {
        await reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  );

  interface CreateWebhookBody {
    readonly url: string;
    readonly events: readonly string[];
  }

  app.get('/webhooks', async (request, reply) => {
    try {
      const claims = requireAuth(request);
      const subscriptions = await deps.webhooks.listByOrganization(claims.organizationId);
      await reply.send({
        webhooks: subscriptions.map((sub) => ({
          id: sub.id,
          url: sub.url,
          events: sub.events,
          createdAt: sub.createdAt,
        })),
      });
    } catch {
      await reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.post<{ Body: CreateWebhookBody }>('/webhooks', async (request, reply) => {
    try {
      const claims = requireAuth(request);
      const events = request.body.events.filter(isWebhookEventName);
      if (events.length === 0) {
        await reply.code(400).send({ message: 'No valid event names provided' });
        return;
      }

      const subscription = await deps.webhooks.create({
        id: generateId(),
        organizationId: claims.organizationId,
        url: request.body.url,
        events,
        secret: generateId(),
        createdAt: new Date().toISOString(),
      });

      await reply.code(201).send({
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        secret: subscription.secret,
      });
    } catch {
      await reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.delete<{ Params: { id: string } }>('/webhooks/:id', async (request, reply) => {
    try {
      requireAuth(request);
      await deps.webhooks.delete(request.params.id);
      await reply.code(204).send();
    } catch {
      await reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.get('/gateway/ws', { websocket: true }, (socket) => {
    const state: GatewayConnectionState = {};

    socket.on('message', (raw: Buffer) => {
      void handleGatewayMessage(
        {
          ...deps,
          onSmsResult: (messageId, result) => {
            smsDispatcher.handleSmsResult(messageId, result);
          },
        },
        state,
        raw.toString(),
      ).then((result) => {
        if (state.deviceId) {
          connections.register(state.deviceId, socket);
        }
        if (result.reply) {
          socket.send(JSON.stringify(result.reply));
        }
        if (result.shouldClose && state.deviceId) {
          connections.unregister(state.deviceId);
        }
        if (result.shouldClose) {
          socket.close();
        }
      });
    });

    socket.on('close', () => {
      if (state.deviceId) {
        connections.unregister(state.deviceId);
      }
    });
  });

  return { app, connections, smsDispatcher };
}
