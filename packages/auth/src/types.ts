export type Role = 'owner' | 'admin' | 'member';

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  /** ANgroup businessId this organization was auto-provisioned for, if any. */
  readonly ssoBusinessId?: string;
}

export interface User {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly createdAt: string;
  /**
   * The only users allowed to bypass ANgroup SSO and log in with a plain
   * email+password (see AuthService.login) - everyone else must sign in
   * through ANgroup and reach this app via /auth/sso/callback.
   */
  readonly isSuperAdmin: boolean;
  /** ANgroup's user id, set once this account has logged in via SSO at least once. */
  readonly ssoUserId?: string;
}

export interface ApiKeyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly hashedKey: string;
  readonly createdAt: string;
  readonly revokedAt?: string;
}

export interface RefreshTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly hashedToken: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
}

export interface DeviceTokenRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly deviceId: string;
  readonly hashedToken: string;
  readonly createdAt: string;
  readonly revokedAt?: string;
}

export interface AccessTokenClaims {
  readonly sub: string;
  readonly organizationId: string;
  readonly role: Role;
}
