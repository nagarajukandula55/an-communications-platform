import type { Device } from '@acp/types';
import { ApiError } from './api-client.js';

export interface AcpUser {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: 'owner' | 'admin' | 'member';
}

export interface AuthSession {
  readonly user: AcpUser;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface DeliveryStats {
  readonly total: number;
  readonly byStatus: Record<string, number>;
  readonly byChannel: Record<string, number>;
}

export interface AcpClientOptions {
  readonly baseUrl: string;
  readonly fetchFn?: typeof fetch;
}

async function parseJsonResponse<T>(response: Response, path: string): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${String(response.status)}`,
      response.status,
      body,
    );
  }
  return body as T;
}

/**
 * Full-surface client for the ACP HTTP API. Unlike ApiClient (a generic
 * bearer-token REST helper), this wraps every route apps/api actually
 * exposes, including the unauthenticated auth endpoints.
 */
export class AcpClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AcpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async postJson<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return parseJsonResponse<T>(response, path);
  }

  private async getJson<T>(path: string, accessToken: string): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return parseJsonResponse<T>(response, path);
  }

  register(organizationName: string, email: string, password: string): Promise<AuthSession> {
    return this.postJson('/auth/register', { organizationName, email, password });
  }

  login(organizationId: string, email: string, password: string): Promise<AuthSession> {
    return this.postJson('/auth/login', { organizationId, email, password });
  }

  refresh(refreshToken: string): Promise<AuthSession> {
    return this.postJson('/auth/refresh', { refreshToken });
  }

  async listDevices(accessToken: string): Promise<Device[]> {
    const body = await this.getJson<{ devices: Device[] }>('/devices', accessToken);
    return body.devices;
  }

  getAnalytics(accessToken: string): Promise<DeliveryStats> {
    return this.getJson('/analytics', accessToken);
  }

  async getIntegrationConfig(
    accessToken: string,
    provider: string,
  ): Promise<Record<string, string>> {
    const body = await this.getJson<{ config: Record<string, string> }>(
      `/integrations/${provider}`,
      accessToken,
    );
    return body.config;
  }

  async setIntegrationConfig(
    accessToken: string,
    provider: string,
    config: Record<string, string>,
  ): Promise<void> {
    const response = await this.fetchFn(`${this.baseUrl}/integrations/${provider}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined);
      throw new ApiError(
        `Request to /integrations/${provider} failed with status ${String(response.status)}`,
        response.status,
        body,
      );
    }
  }
}
