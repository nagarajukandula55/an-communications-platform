/**
 * Mirrors the payload shape returned by ANgroup's POST /api/sso/verify.
 * See angroup's src/app/api/sso/verify/route.ts / src/lib/auth/jwt.ts for
 * the source of truth - this is a client, not the token issuer.
 */
export interface SsoVendorMembership {
  readonly vendorId: string;
  readonly vendorRole: string | null;
  readonly memberType: string;
}

export interface SsoUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly username: string | null;
  readonly role: string;
  readonly isSuperAdmin: boolean;
  readonly avatar: string | null;
  readonly businessIds: readonly string[];
  readonly activeBusinessId: string | null;
  readonly memberType: string | null;
  readonly vendorMemberships: readonly SsoVendorMembership[];
}

export interface SsoVerifyResult {
  readonly valid: boolean;
  readonly user?: SsoUser;
  readonly permissions?: readonly string[];
  readonly issuer?: string;
  readonly issuedAt?: string | null;
  readonly expiresAt?: string | null;
  readonly message?: string;
}

export class SsoTokenInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsoTokenInvalidError';
  }
}
