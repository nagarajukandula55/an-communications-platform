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
import { ConnectionRegistry } from './connection-registry.js';
import {
  handleGatewayMessage,
  type GatewayConnectionState,
} from './gateway.js';
import { WsDeviceCommandDispatcher } from './ws-device-command-dispatcher.js';

export interface AppDeps {
  readonly auth: AuthService;
  readonly tokens: TokenService;
  readonly devices: DeviceService;
  readonly deviceTokens: DeviceTokenRepository;
  readonly analytics: AnalyticsRepository;
  readonly integrations: IntegrationsService;
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

export async function buildApp(deps: AppDeps): Promise<BuiltApp> {
  const app = Fastify({ logger: false });
  await app.register(websocketPlugin);

  const connections = new ConnectionRegistry();
  const smsDispatcher = new WsDeviceCommandDispatcher({ registry: connections });

  app.get('/health', () => ({ status: 'ok' }));

  app.post<{ Body: RegisterBody }>('/auth/register', async (request, reply) => {
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
  });

  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
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
  });

  app.post<{ Body: RefreshBody }>('/auth/refresh', async (request, reply) => {
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
  });

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
