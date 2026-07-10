import jwt from 'jsonwebtoken';
import type { ApnsConfig, FetchLike, PushNotification, PushSendResult } from './types.js';

export class ApnsRequestError extends Error {
  constructor(status: number, body: string) {
    super(`APNs request failed (${String(status)}): ${body}`);
    this.name = 'ApnsRequestError';
  }
}

export class ApnsSender {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBaseUrl = 'https://api.push.apple.com',
  ) {}

  private signToken(config: ApnsConfig): string {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({ iss: config.teamId, iat: now }, config.privateKey, {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: config.keyId },
    });
  }

  async send(
    config: ApnsConfig,
    deviceToken: string,
    notification: PushNotification,
  ): Promise<PushSendResult> {
    const token = this.signToken(config);

    const response = await this.fetchFn(`${this.apiBaseUrl}/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${token}`,
        'apns-topic': config.bundleId,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        aps: { alert: { title: notification.title, body: notification.body } },
      }),
    });

    if (!response.ok) {
      throw new ApnsRequestError(response.status, await response.text());
    }

    const apnsId = response.headers.get('apns-id');
    return { ...(apnsId !== null ? { providerRef: apnsId } : {}) };
  }
}
