import jwt from 'jsonwebtoken';
import type { FcmConfig, FetchLike, PushNotification, PushSendResult } from './types.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

export class FcmRequestError extends Error {
  constructor(status: number, body: string) {
    super(`FCM request failed (${String(status)}): ${body}`);
    this.name = 'FcmRequestError';
  }
}

interface TokenResponse {
  readonly access_token: string;
}

interface SendResponse {
  readonly name?: string;
}

export class FcmSender {
  constructor(private readonly fetchFn: FetchLike = fetch) {}

  private async getAccessToken(config: FcmConfig): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      {
        iss: config.clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      },
      config.privateKey,
      { algorithm: 'RS256' },
    );

    const response = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: GRANT_TYPE, assertion }),
    });

    if (!response.ok) {
      throw new FcmRequestError(response.status, await response.text());
    }

    const body = (await response.json()) as TokenResponse;
    return body.access_token;
  }

  async send(
    config: FcmConfig,
    deviceToken: string,
    notification: PushNotification,
  ): Promise<PushSendResult> {
    const accessToken = await this.getAccessToken(config);

    const response = await this.fetchFn(
      `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: notification.title, body: notification.body },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new FcmRequestError(response.status, await response.text());
    }

    const body = (await response.json()) as SendResponse;
    return { ...(body.name !== undefined ? { providerRef: body.name } : {}) };
  }
}
