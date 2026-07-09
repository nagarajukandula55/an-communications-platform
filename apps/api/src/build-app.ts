import websocketPlugin from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  EmailInUseError,
  InvalidCredentialsError,
  type AuthService,
  type DeviceTokenRepository,
} from '@acp/auth';
import type { DeviceService } from '@acp/devices';
import {
  handleGatewayMessage,
  type GatewayConnectionState,
} from './gateway.js';

export interface AppDeps {
  readonly auth: AuthService;
  readonly devices: DeviceService;
  readonly deviceTokens: DeviceTokenRepository;
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

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(websocketPlugin);

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

  app.get('/gateway/ws', { websocket: true }, (socket) => {
    const state: GatewayConnectionState = {};

    socket.on('message', (raw: Buffer) => {
      void handleGatewayMessage(deps, state, raw.toString()).then((result) => {
        if (result.reply) {
          socket.send(JSON.stringify(result.reply));
        }
        if (result.shouldClose) {
          socket.close();
        }
      });
    });
  });

  return app;
}
