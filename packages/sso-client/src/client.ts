import { SsoTokenInvalidError, type SsoUser, type SsoVerifyResult } from './types.js';

export interface SsoClientConfig {
  /** Base URL of the ANgroup deployment, e.g. https://angroup.in */
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Talks to ANgroup's public POST /api/sso/verify endpoint. No shared
 * secret needed here - ANgroup verifies its own HS256-signed token
 * server-side and only ever hands back the decoded claims, so this
 * client never has to know SSO_SECRET.
 *
 * There is no browser-redirect login page on ANgroup's side (confirmed
 * by reading its /api/sso/token and /admin/sso/page.tsx source) - the
 * real flow is: the user logs into the ANgroup portal, ANgroup calls
 * its own POST /api/sso/token to mint a short-lived token, then ANgroup
 * links out to the consuming app (e.g. https://acp.example.com/sso/callback
 * ?token=...). Consuming apps only ever verify, they never initiate a
 * redirect-to-ANgroup login flow.
 */
export class SsoClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: SsoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  /** Where to send a user with no local session, so they can launch this app from ANgroup with a token attached. */
  get portalUrl(): string {
    return this.baseUrl;
  }

  async verify(ssoToken: string): Promise<SsoUser> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/sso/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: ssoToken }),
    });

    const body = (await response.json()) as SsoVerifyResult;
    if (!response.ok || !body.valid || !body.user) {
      throw new SsoTokenInvalidError(body.message ?? 'SSO token verification failed');
    }

    return body.user;
  }
}
